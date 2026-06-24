import type { PendingTimerEvent, TimerState } from "@/shared/types/timer";
import { emptyTimerState } from "@/shared/types/timer";
import { tickTimerState } from "@/shared/time/format";

/**
 * Applies pending timer events over the canonical timer state for immediate UI.
 */
export function projectTimerState(
  canonical: TimerState | null,
  pending: PendingTimerEvent[],
  now = new Date(),
): TimerState {
  let projected = tickTimerState(canonical ?? emptyTimerState(now), now);
  const sorted = [...pending].sort((a, b) => a.clientSequence - b.clientSequence);

  for (const event of sorted) {
    if (event.type === "start" && !projected.active_session) {
      projected = {
        ...projected,
        active_session: {
          id: event.localTimerId,
          started_at_utc: event.occurredAtUtc,
          ended_at_utc: null,
          duration_seconds: null,
          pending: true,
        },
        elapsed_seconds: Math.max(
          0,
          Math.floor((now.getTime() - Date.parse(event.occurredAtUtc)) / 1000),
        ),
      };
    }

    if (event.type === "stop" && projected.active_session) {
      projected = {
        ...projected,
        active_session: null,
        elapsed_seconds: 0,
      };
    }
  }

  return projected;
}
