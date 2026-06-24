import { useEffect, useRef } from "react";
import { loadActionEditDrafts } from "@/shared/storage/activityStore";
import type { ActionItem } from "@/shared/types/activities";

export function useRestoreActionEditDrafts(
  actions: ActionItem[],
  onAutosaveDetails: (action: ActionItem, title: string, descriptionMd: string) => Promise<void>,
) {
  const restoredDraftsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const draftItem of loadActionEditDrafts()) {
      if (restoredDraftsRef.current.has(draftItem.actionId)) continue;
      const action = actions.find((item) => item.id === draftItem.actionId);
      if (!action) continue;
      restoredDraftsRef.current.add(draftItem.actionId);
      void onAutosaveDetails(action, draftItem.title || action.title, draftItem.descriptionMd);
    }
  }, [actions, onAutosaveDetails]);
}
