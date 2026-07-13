"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { BraiApi } from "@/shared/api/braiApi";
import { pendingActivityEvents, projectActivitiesState } from "@/shared/storage/activityStore";
import { ensureClientMeta } from "@/shared/storage/db";
import {
  enqueueActionWithGoalRelation,
  enqueueRelationEvent,
  loadRelationSyncIssues,
  loadRelationsState,
  markRelationAttempt,
  markRelationFailure,
  pendingRelationEvents,
  projectRelationsState,
  reconcileRelationDependencies,
  readyRelationEvents,
  saveRelationsState,
  saveRelationSyncIssues,
} from "@/shared/storage/relationStore";
import { acknowledgeRelationEvents } from "@/shared/storage/relationAcknowledgement";
import type { ActivitiesState } from "@/shared/types/activities";
import { emptyRelationsState, type RelationItem, type RelationSyncIssue, type RelationsState } from "@/shared/types/relations";
import type { SyncStatus } from "@/shared/types/timer";

type RelationWorkspaceOptions = {
  api: BraiApi;
  flushActionPending: (sourceApi?: BraiApi) => Promise<void>;
  getActions: () => ActivitiesState;
  setActions: Dispatch<SetStateAction<ActivitiesState>>;
  setActionPendingCount: Dispatch<SetStateAction<number>>;
  setSyncStatus: Dispatch<SetStateAction<SyncStatus>>;
};

const RELATION_SYNC_BATCH_LIMIT = 500;

/** Owns the restart-safe Relation snapshot, outbox, and Goal membership commands. */
export function useBraiRelations({
  api,
  flushActionPending,
  getActions,
  setActions,
  setActionPendingCount,
  setSyncStatus,
}: RelationWorkspaceOptions) {
  const apiRef = useRef(api);
  const revisionRef = useRef(0);
  const canonicalRef = useRef<RelationsState>(emptyRelationsState());
  const stateRef = useRef<RelationsState>(emptyRelationsState());
  const flushInFlightRef = useRef(false);
  const flushAgainRef = useRef(false);
  const [relations, setRelations] = useState<RelationsState>(stateRef.current);
  const [relationPendingCount, setRelationPendingCount] = useState(0);
  const [relationSyncIssues, setRelationSyncIssues] = useState<RelationSyncIssue[]>([]);

  useEffect(() => {
    apiRef.current = api;
  }, [api]);

  function setSnapshot(next: RelationsState) {
    if (next.server_revision < revisionRef.current) return;
    revisionRef.current = next.server_revision;
    stateRef.current = next;
    setRelations(next);
  }

  async function loadLocalRelations() {
    await reconcileRelationDependencies();
    const [cached, pending] = await Promise.all([loadRelationsState(), pendingRelationEvents()]);
    if (cached) revisionRef.current = cached.server_revision;
    canonicalRef.current = cached ?? emptyRelationsState();
    setSnapshot(projectRelationsState(cached, pending));
    setRelationPendingCount(pending.length);
    setRelationSyncIssues(await loadRelationSyncIssues());
  }

  async function refreshRelationsAndFlush(sourceApi = apiRef.current) {
    const next = await sourceApi.relations();
    const accepted = next.server_revision >= revisionRef.current && await saveRelationsState(next);
    const pending = await pendingRelationEvents();
    const canonical = accepted ? next : await loadRelationsState();
    if (canonical) {
      canonicalRef.current = canonical;
      setSnapshot(projectRelationsState(canonical, pending));
    }
    setRelationPendingCount(pending.length);
    await flushRelationPending(sourceApi);
  }

  async function applyRelationsState(next: RelationsState) {
    if (next.server_revision < revisionRef.current) return;
    const accepted = await saveRelationsState(next);
    if (!accepted) return;
    const pending = await pendingRelationEvents();
    canonicalRef.current = next;
    setSnapshot(projectRelationsState(next, pending));
    setRelationPendingCount(pending.length);
  }

  async function flushRelationPending(sourceApi = apiRef.current) {
    if (flushInFlightRef.current) {
      flushAgainRef.current = true;
      return;
    }
    flushInFlightRef.current = true;
    try {
      await reconcileRelationDependencies();
      const allPending = await pendingRelationEvents();
      setRelationPendingCount(allPending.length);
      if (allPending.length === 0) {
        setRelationSyncIssues(await loadRelationSyncIssues());
        return;
      }
      const ready = (await readyRelationEvents()).slice(0, RELATION_SYNC_BATCH_LIMIT);
      if (ready.length === 0) {
        setSyncStatus("pending_sync");
        return;
      }
      setSyncStatus("pending_sync");
      await markRelationAttempt(ready);
      const meta = await ensureClientMeta();
      const response = await sourceApi.syncRelationEvents({
        deviceId: meta.deviceId,
        platform: meta.platform,
        events: ready,
        lastKnownServerTimeUtc: stateRef.current.server_time_utc,
      });
      const deferredIds = new Set(response.deferred_events.map((event) => event.event_id));
      const acknowledged = [...response.acknowledged_event_ids, ...response.ignored_events.map((event) => event.event_id)]
        .filter((eventId) => !deferredIds.has(eventId));
      if (response.ignored_events.length > 0) {
        const ignoredWithDraft = response.ignored_events.map((issue) => {
          const event = ready.find((candidate) => candidate.eventId === issue.event_id);
          return { ...issue, relation_id: event?.relationId, change_type: event?.type, payload: event?.payload };
        });
        await saveRelationSyncIssues(ignoredWithDraft);
      }
      const responseState = response.state.next_cursor ? await sourceApi.relations() : response.state;
      const ignoredIds = new Set(response.ignored_events.map((event) => event.event_id));
      const accepted = await acknowledgeRelationEvents({
        acknowledgedEventIds: acknowledged,
        acceptedEvents: ready.filter((event) => acknowledged.includes(event.eventId) && !ignoredIds.has(event.eventId)),
        ignoredEvents: response.ignored_events,
        state: responseState,
      });
      const deferred = ready.filter((event) => deferredIds.has(event.eventId));
      if (deferred.length > 0) await markRelationFailure(deferred, "endpoint_not_ready");
      const remaining = await pendingRelationEvents();
      const canonical = accepted ? responseState : await loadRelationsState();
      if (canonical) {
        canonicalRef.current = canonical;
        setSnapshot(projectRelationsState(canonical, remaining));
      }
      setRelationPendingCount(remaining.length);
      setRelationSyncIssues(await loadRelationSyncIssues());
      if (acknowledged.length > 0 && (await readyRelationEvents()).length > 0) flushAgainRef.current = true;
      if (remaining.length === 0) setSyncStatus("synced");
    } catch (error) {
      const syncing = (await pendingRelationEvents()).filter((event) => event.status === "syncing");
      if (syncing.length > 0) await markRelationFailure(syncing, error instanceof Error ? error.message : "sync_failed");
      setRelationSyncIssues(await loadRelationSyncIssues());
      setSyncStatus(typeof navigator !== "undefined" && navigator.onLine ? "sync_failed" : "offline");
    } finally {
      flushInFlightRef.current = false;
      if (flushAgainRef.current) {
        flushAgainRef.current = false;
        void flushRelationPending(sourceApi);
      }
    }
  }

  async function queueRelation(input: Parameters<typeof enqueueRelationEvent>[0]) {
    await enqueueRelationEvent(input);
    const pending = await pendingRelationEvents();
    const projected = projectRelationsState(canonicalRef.current, pending);
    stateRef.current = projected;
    setRelations(projected);
    setRelationPendingCount(pending.length);
    setSyncStatus("pending_sync");
    void flushRelationPending().catch(() => undefined);
  }

  async function reprojectRelationOutbox() {
    await reconcileRelationDependencies();
    const pending = await pendingRelationEvents();
    const canonical = await loadRelationsState();
    if (canonical) canonicalRef.current = canonical;
    const projected = projectRelationsState(canonicalRef.current, pending);
    stateRef.current = projected;
    setRelations(projected);
    setRelationPendingCount(pending.length);
    setRelationSyncIssues(await loadRelationSyncIssues());
  }

  async function ensureGoalRelationsSynced(goalItemsId: string) {
    await flushRelationPending();
    const pending = await pendingRelationEvents();
    if (pending.some((event) =>
      event.payload.target_items_id === goalItemsId
      || (event.type === "end" && stateRef.current.ended_relations.some((relation) =>
        relation.id === event.relationId && relation.target_items_id === goalItemsId && relation.pending,
      )),
    )) {
      throw new Error("goal_membership_pending");
    }
  }

  async function onAddToGoals(itemsId: string, goalIds: string[]) {
    const activeTargets = new Set(stateRef.current.relations
      .filter((relation) => relation.status === "active" && relation.relation_types_id === "part_of" && relation.source_items_id === itemsId)
      .map((relation) => relation.target_items_id));
    for (const goalId of [...new Set(goalIds)]) {
      if (activeTargets.has(goalId)) continue;
      await enqueueRelationEvent({
        type: "create",
        payload: { relation_type_id: "part_of", source_items_id: itemsId, target_items_id: goalId },
        baseServerRevision: stateRef.current.server_revision,
      });
    }
    const pending = await pendingRelationEvents();
    const projected = projectRelationsState(canonicalRef.current, pending);
    stateRef.current = projected;
    setRelations(projected);
    setRelationPendingCount(pending.length);
    if (pending.length > 0) {
      setSyncStatus("pending_sync");
      void flushRelationPending().catch(() => undefined);
    }
  }

  async function onRemoveFromGoal(relation: RelationItem) {
    await queueRelation({
      type: "end",
      relationId: relation.id,
      payload: { reason: "removed_by_user" },
      baseServerRevision: stateRef.current.server_revision,
    });
  }

  async function onReorderGoal(goalId: string, orderedRelationIds: string[]) {
    await queueRelation({
      type: "reorder",
      payload: { relation_type_id: "part_of", target_items_id: goalId, ordered_relation_ids: orderedRelationIds },
      baseServerRevision: stateRef.current.server_revision,
    });
  }

  async function onPlanGoal(goal: { id: string }) {
    return apiRef.current.requestGoalPlan(goal.id);
  }

  async function onCreateActionInGoal(title: string, descriptionMd: string, goalItemsId: string) {
    await enqueueActionWithGoalRelation({
      title,
      descriptionMd,
      goalItemsId,
      position: 0,
      activityBaseServerRevision: getActions().server_revision,
      relationBaseServerRevision: stateRef.current.server_revision,
    });
    const [activityPending, relationPending] = await Promise.all([pendingActivityEvents(), pendingRelationEvents()]);
    setActions(projectActivitiesState(getActions(), activityPending));
    setActionPendingCount(activityPending.length);
    const projected = projectRelationsState(canonicalRef.current, relationPending);
    stateRef.current = projected;
    setRelations(projected);
    setRelationPendingCount(relationPending.length);
    setSyncStatus("pending_sync");
    await flushActionPending();
    void flushRelationPending().catch(() => undefined);
  }

  function resetRelations() {
    revisionRef.current = 0;
    canonicalRef.current = emptyRelationsState();
    stateRef.current = emptyRelationsState();
    setRelations(stateRef.current);
    setRelationPendingCount(0);
    setRelationSyncIssues([]);
  }

  return {
    applyRelationsState,
    ensureGoalRelationsSynced,
    flushRelationPending,
    loadLocalRelations,
    onAddToGoals,
    onCreateActionInGoal,
    onRemoveFromGoal,
    onReorderGoal,
    onPlanGoal,
    refreshRelationsAndFlush,
    relationServerRevision: stateRef.current.server_revision,
    relationPendingCount,
    relationSyncIssues,
    relations,
    reprojectRelationOutbox,
    resetRelations,
  };
}
