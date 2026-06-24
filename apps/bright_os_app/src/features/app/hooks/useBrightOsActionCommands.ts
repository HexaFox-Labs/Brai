import type { Dispatch, SetStateAction } from "react";
import { cleanTitle, normalizeDescription } from "@/shared/activities/text";
import { clearActionEditDraft, enqueueActionEvent, pendingActionEvents, projectActionsState } from "@/shared/storage/activityStore";
import type { ActionItem, ActionsState, ActionStatus } from "@/shared/types/activities";
import type { SyncStatus } from "@/shared/types/timer";
import { ACTION_DELETE_COLLAPSE_MS } from "../sections/actions/constants";

/**
 * Creates the action handlers that write local outbox events before syncing.
 */
export function createBrightOsActionCommands({
  actions,
  flushActionPending,
  setActionPendingCount,
  setActions,
  setSyncStatus,
}: {
  actions: ActionsState;
  flushActionPending: () => Promise<void>;
  setActionPendingCount: Dispatch<SetStateAction<number>>;
  setActions: Dispatch<SetStateAction<ActionsState>>;
  setSyncStatus: Dispatch<SetStateAction<SyncStatus>>;
}) {
  async function queueActionEvent(event: Parameters<typeof enqueueActionEvent>[0]) {
    await enqueueActionEvent(event);
    const queued = await pendingActionEvents();
    setActions(projectActionsState(actions, queued));
    setActionPendingCount(queued.length);
    setSyncStatus("pending_sync");
    await flushActionPending();
  }

  async function onCreateAction(title: string) {
    const trimmed = cleanTitle(title);
    if (!trimmed) return;
    await queueActionEvent({
      type: "create",
      payload: { title: trimmed },
      baseServerRevision: actions.server_revision,
    });
  }

  async function onUpdateActionTitle(action: ActionItem, title: string) {
    const trimmed = cleanTitle(title);
    if (!trimmed || trimmed === action.title) return;
    await queueActionEvent({
      type: "update_title",
      actionId: action.id,
      payload: { title: trimmed },
      baseServerRevision: actions.server_revision,
    });
  }

  async function onAutosaveActionDetails(action: ActionItem, title: string, descriptionMd: string) {
    const trimmed = cleanTitle(title);
    const current = actions.actions.find((item) => item.id === action.id) ?? action;
    const nextDescription = normalizeDescription(descriptionMd);
    let changed = false;

    if (trimmed && trimmed !== current.title) {
      await enqueueActionEvent({
        type: "update_title",
        actionId: action.id,
        payload: { title: trimmed },
        baseServerRevision: actions.server_revision,
      });
      changed = true;
    }
    if (nextDescription !== normalizeDescription(current.description_md)) {
      await enqueueActionEvent({
        type: "update_description",
        actionId: action.id,
        payload: { description_md: nextDescription },
        baseServerRevision: actions.server_revision,
      });
      changed = true;
    }

    clearActionEditDraft(action.id);
    if (!changed) return;

    const queued = await pendingActionEvents();
    setActions(projectActionsState(actions, queued));
    setActionPendingCount(queued.length);
    setSyncStatus("pending_sync");
    await flushActionPending();
  }

  async function onSetActionStatus(action: ActionItem, status: ActionStatus) {
    if (action.status === status) return;
    await queueActionEvent({
      type: "set_status",
      actionId: action.id,
      payload: { status },
      baseServerRevision: actions.server_revision,
    });
  }

  async function onDeleteAction(action: ActionItem) {
    await enqueueActionEvent({
      type: "delete",
      actionId: action.id,
      payload: {},
      baseServerRevision: actions.server_revision,
    });
    await delayActionProjection();
  }

  async function onRestoreAction(action: ActionItem) {
    await enqueueActionEvent({
      type: "restore",
      actionId: action.id,
      payload: {},
      baseServerRevision: actions.server_revision,
    });
    await delayActionProjection();
  }

  async function delayActionProjection() {
    const queued = await pendingActionEvents();
    setActionPendingCount(queued.length);
    setSyncStatus("pending_sync");
    window.setTimeout(() => {
      setActions((current) => projectActionsState(current, queued));
      void flushActionPending();
    }, ACTION_DELETE_COLLAPSE_MS);
  }

  async function onReorderActions(orderedIds: string[], movedAction: ActionItem) {
    const currentIds = actions.actions.filter((action) => action.status === "New").map((action) => action.id);
    if (orderedIds.join("\n") === currentIds.join("\n")) return;
    await queueActionEvent({
      type: "reorder",
      actionId: movedAction.id,
      payload: { ordered_ids: orderedIds },
      baseServerRevision: actions.server_revision,
    });
  }

  return {
    onAutosaveActionDetails,
    onCreateAction,
    onDeleteAction,
    onReorderActions,
    onRestoreAction,
    onSetActionStatus,
    onUpdateActionTitle,
  };
}
