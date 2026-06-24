import { useEffect, useState } from "react";
import { normalizeDescription } from "@/shared/activities/text";
import { loadActionEditDrafts, saveActionEditDraft } from "@/shared/storage/activityStore";
import type { ActionItem } from "@/shared/types/activities";

export function activityDraftValues(action: ActionItem): { title: string; descriptionMd: string } {
  const draft = loadActionEditDrafts().find((item) => item.actionId === action.id);
  return {
    title: draft?.title || action.title,
    descriptionMd: draft?.descriptionMd ?? normalizeDescription(action.description_md),
  };
}

export function useActivityDraftAutosave(
  action: ActionItem,
  onAutosaveDetails: (action: ActionItem, title: string, descriptionMd: string) => Promise<void>,
) {
  const [autosave] = useState(() => createActivityDraftAutosave());

  useEffect(() => {
    autosave.setTarget(action, onAutosaveDetails);
  }, [action, autosave, onAutosaveDetails]);

  return autosave;
}

export function scheduleActivityDraftEdit(
  action: ActionItem,
  title: string,
  descriptionMd: string,
  onTitleDraftChange: (actionId: string, title: string | null) => void,
  autosave: ActivityDraftAutosave,
) {
  onTitleDraftChange(action.id, title === action.title ? null : title);
  saveActionEditDraft(action.id, title, descriptionMd);
  autosave.schedule(title, descriptionMd);
}

type ActivityDraftAutosave = ReturnType<typeof createActivityDraftAutosave>;

function createActivityDraftAutosave() {
  let latest: { title: string; descriptionMd: string } | null = null;
  let timer: number | null = null;
  let maxTimer: number | null = null;
  let action: ActionItem | null = null;
  let callback: ((action: ActionItem, title: string, descriptionMd: string) => Promise<void>) | null = null;

  function clearTimers() {
    if (timer != null) window.clearTimeout(timer);
    if (maxTimer != null) window.clearTimeout(maxTimer);
    timer = null;
    maxTimer = null;
  }

  function flush() {
    if (!latest || !action || !callback) return;
    const next = latest;
    latest = null;
    clearTimers();
    void callback(action, next.title, next.descriptionMd);
  }

  return {
    setTarget(
      nextAction: ActionItem,
      nextCallback: (action: ActionItem, title: string, descriptionMd: string) => Promise<void>,
    ) {
      action = nextAction;
      callback = nextCallback;
    },
    flush,
    schedule(title: string, descriptionMd: string) {
      latest = { title, descriptionMd };
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(flush, 600);
      if (maxTimer == null) maxTimer = window.setTimeout(flush, 2000);
    },
  };
}
