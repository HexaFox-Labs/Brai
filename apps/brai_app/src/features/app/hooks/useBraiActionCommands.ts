import type { Dispatch, SetStateAction } from "react";
import { cleanTitle, normalizeDescription } from "@/shared/activities/text";
import { clearActivityEditDraft, enqueueActivityEvent, pendingActivityEvents, projectActivitiesState } from "@/shared/storage/activityStore";
import type { ActivityItem, ActivitiesState, ActivityStatus } from "@/shared/types/activities";
import type { SyncStatus } from "@/shared/types/timer";
import { ACTION_DELETE_COLLAPSE_MS } from "../sections/actions/constants";

/**
 * Creates the action handlers that write local outbox events before syncing.
 */
export function createBraiActionCommands({
  actions,
  flushActionPending,
  getActions,
  publishActionsSnapshot,
  setActionPendingCount,
  setActions,
  setSyncStatus,
}: {
  actions: ActivitiesState;
  flushActionPending: () => Promise<void>;
  getActions?: () => ActivitiesState;
  publishActionsSnapshot?: (nextActions: ActivitiesState) => Promise<void>;
  setActionPendingCount: Dispatch<SetStateAction<number>>;
  setActions: Dispatch<SetStateAction<ActivitiesState>>;
  setSyncStatus: Dispatch<SetStateAction<SyncStatus>>;
}) {
  function currentActions(): ActivitiesState {
    return getActions?.() ?? actions;
  }

  async function queueActionEvent(event: Parameters<typeof enqueueActivityEvent>[0]) {
    await enqueueActivityEvent(event);
    const queued = await pendingActivityEvents();
    const projected = projectActivitiesState(currentActions(), queued);
    setActions(projected);
    setActionPendingCount(queued.length);
    setSyncStatus("pending_sync");
    void publishActionsSnapshot?.(projected).catch(() => undefined);
    void flushActionPending().catch(() => undefined);
  }

  async function onCreateAction(title: string, descriptionMd = "") {
    const trimmed = cleanTitle(title);
    if (!trimmed) return;
    const current = currentActions();
    await queueActionEvent({
      type: "create",
      payload: { title: trimmed, description_md: normalizeDescription(descriptionMd) },
      baseServerRevision: current.server_revision,
    });
  }

  async function onUpdateActionTitle(action: ActivityItem, title: string) {
    const trimmed = cleanTitle(title);
    const current = currentActions();
    const currentAction = current.actions.find((item) => item.id === action.id) ?? action;
    if (!trimmed || trimmed === currentAction.title) return;
    await queueActionEvent({
      type: "update_title",
      actionId: action.id,
      payload: { title: trimmed },
      baseServerRevision: current.server_revision,
    });
  }

  async function onAutosaveActionDetails(action: ActivityItem, title: string, descriptionMd: string) {
    const trimmed = cleanTitle(title);
    const current = currentActions();
    const currentAction = current.actions.find((item) => item.id === action.id) ?? action;
    const nextDescription = normalizeDescription(descriptionMd);
    let changed = false;

    if (trimmed && trimmed !== currentAction.title) {
      await enqueueActivityEvent({
        type: "update_title",
        actionId: action.id,
        payload: { title: trimmed },
        baseServerRevision: current.server_revision,
      });
      changed = true;
    }
    if (nextDescription !== normalizeDescription(currentAction.description_md)) {
      await enqueueActivityEvent({
        type: "update_description",
        actionId: action.id,
        payload: { description_md: nextDescription },
        baseServerRevision: current.server_revision,
      });
      changed = true;
    }

    clearActivityEditDraft(action.id);
    if (!changed) return;

    const queued = await pendingActivityEvents();
    const projected = projectActivitiesState(currentActions(), queued);
    setActions(projected);
    setActionPendingCount(queued.length);
    setSyncStatus("pending_sync");
    void publishActionsSnapshot?.(projected).catch(() => undefined);
    void flushActionPending().catch(() => undefined);
  }

  async function onSetActionStatus(action: ActivityItem, status: ActivityStatus) {
    const current = currentActions();
    const currentAction = current.actions.find((item) => item.id === action.id) ?? action;
    if (currentAction.status === status) return;
    await queueActionEvent({
      type: "set_status",
      actionId: action.id,
      payload: { status },
      baseServerRevision: current.server_revision,
    });
  }

  async function onDeleteAction(action: ActivityItem) {
    const current = currentActions();
    await enqueueActivityEvent({
      type: "delete",
      actionId: action.id,
      payload: {},
      baseServerRevision: current.server_revision,
    });
    await delayActionProjection();
  }

  async function onRestoreAction(action: ActivityItem) {
    const current = currentActions();
    await enqueueActivityEvent({
      type: "restore",
      actionId: action.id,
      payload: {},
      baseServerRevision: current.server_revision,
    });
    await delayActionProjection();
  }

  async function delayActionProjection() {
    const queued = await pendingActivityEvents();
    const projectedNow = projectActivitiesState(currentActions(), queued);
    setActionPendingCount(queued.length);
    setSyncStatus("pending_sync");
    void publishActionsSnapshot?.(projectedNow).catch(() => undefined);
    window.setTimeout(() => {
      let projected = currentActions();
      setActions((current) => {
        projected = projectActivitiesState(current, queued);
        return projected;
      });
      void publishActionsSnapshot?.(projected).catch(() => undefined);
      void flushActionPending().catch(() => undefined);
    }, ACTION_DELETE_COLLAPSE_MS);
  }

  async function onReorderActions(orderedIds: string[], movedAction: ActivityItem) {
    const current = currentActions();
    const currentIds = current.actions.filter((action) => action.status === "New").map((action) => action.id);
    if (orderedIds.join("\n") === currentIds.join("\n")) return;
    await queueActionEvent({
      type: "reorder",
      actionId: movedAction.id,
      payload: { ordered_ids: orderedIds },
      baseServerRevision: current.server_revision,
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
