import type { HistoryData } from "@/shared/types/timer";

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function fitTextareaHeight(node: HTMLTextAreaElement | null): void {
  if (!node) return;
  node.style.height = "auto";
  node.style.height = `${node.scrollHeight}px`;
}

export function normalizeHistory(history: HistoryData): HistoryData {
  return {
    sessions: history.sessions ?? [],
    groups: history.groups ?? {},
  };
}

export function moscowTodayKey(): string {
  return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
