"use client";

import { useEffect, useRef, useState } from "react";
import type { BraiApi } from "@/shared/api/braiApi";
import { defaultApiBase } from "@/shared/config/runtime";
import { loadContextDecisionsState, saveContextDecisionsState } from "@/shared/storage/contextDecisionStore";
import { emptyContextDecisionsState, type ContextDecision, type ContextDecisionsState, type ContextResolution } from "@/shared/types/contextDecisions";

const MAX_CONTEXT_REVIEW_SNAPSHOT_ATTEMPTS = 3;

/** Caches compact pending decisions/audits and refreshes them through poll/live state. */
export function useBraiContextReviews(api: BraiApi) {
  const apiRef = useRef(api);
  useEffect(() => { apiRef.current = api; }, [api]);
  const revisionRef = useRef(0);
  const [contextReviews, setContextReviews] = useState<ContextDecisionsState>(emptyContextDecisionsState());

  async function loadLocalContextReviews() {
    const cached = await loadContextDecisionsState();
    if (!cached) return;
    revisionRef.current = cached.server_revision;
    setContextReviews(cached);
  }

  async function applyContextReviewsState(next: ContextDecisionsState) {
    if (next.server_revision < revisionRef.current) return;
    const accepted = await saveContextDecisionsState(next);
    if (!accepted) return;
    revisionRef.current = next.server_revision;
    setContextReviews(next);
  }

  async function refreshContextReviews(sourceApi = apiRef.current) {
    for (let attempt = 1; attempt <= MAX_CONTEXT_REVIEW_SNAPSHOT_ATTEMPTS; attempt += 1) {
      const [next, autoAccepted, auditConfirmed] = await Promise.all([
        sourceApi.contextDecisions("pending"),
        sourceApi.contextDecisions("auto_accepted"),
        sourceApi.contextDecisions("audit_confirmed"),
      ]);
      if (autoAccepted.server_revision !== next.server_revision || auditConfirmed.server_revision !== next.server_revision) {
        if (attempt === MAX_CONTEXT_REVIEW_SNAPSHOT_ATTEMPTS) throw new Error("context_reviews_revision_drift");
        continue;
      }
      await applyContextReviewsState({
        ...next,
        decisions: [...next.decisions, ...autoAccepted.decisions, ...auditConfirmed.decisions]
          .sort((left, right) => right.created_at_utc.localeCompare(left.created_at_utc)),
      });
      return;
    }
  }

  async function onUndoContextDecision(decision: ContextDecision) {
    await apiRef.current.undoContextDecision(decision.id, `product:undo:${decision.id}`);
    await refreshContextReviews();
  }

  async function onResolveContextDecision(decision: ContextDecision, resolution: ContextResolution, editedPayload?: Record<string, unknown>) {
    if (decision.audit_id) {
      await apiRef.current.resolveContextAudit(decision.id, {
        resolution,
        idempotency_key: `product:audit:${decision.audit_id}:${decision.id}:${resolution}`,
      });
    } else {
      await apiRef.current.resolveContextDecision(decision.id, {
        resolution,
        idempotency_key: `product:${decision.id}:${resolution}`,
        ...(editedPayload ? { edited_payload: editedPayload } : {}),
      });
    }
    await refreshContextReviews();
  }

  function resetContextReviews() {
    revisionRef.current = 0;
    setContextReviews(emptyContextDecisionsState());
  }

  return { applyContextReviewsState, contextReviews, loadLocalContextReviews, onResolveContextDecision, onUndoContextDecision, refreshContextReviews, resetContextReviews };
}

/** Marks a one-time policy notification read through the environment-specific API. */
export async function markContextNotificationRead(notificationId: string): Promise<void> {
  const path = `/v1/context-notifications/${encodeURIComponent(notificationId)}/read`;
  const base = defaultApiBase();
  const response = await fetch(!base || base === "/" ? path : `${base.replace(/\/$/, "")}${path}`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok && response.status !== 404) throw new Error(`brai_api_${response.status}`);
}
