import { describe, expect, it } from "vitest";
import { projectTimerState } from "@/shared/storage/projection";
import { emptyTimerState, type PendingTimerEvent } from "@/shared/types/timer";

function event(sequence: number, type: "start" | "stop", occurredAtUtc: string): PendingTimerEvent {
  return {
    eventId: `event-${sequence}`,
    deviceId: "device",
    clientSequence: sequence,
    type,
    occurredAtUtc,
    localTimerId: "local-timer",
    baseServerRevision: 0,
    payloadVersion: 1,
    status: "pending",
    attemptCount: 0,
    enqueuedAtUtc: occurredAtUtc,
  };
}

describe("pending projection", () => {
  it("projects offline start as running", () => {
    const state = projectTimerState(
      emptyTimerState(new Date("2026-06-14T10:00:00.000Z")),
      [event(1, "start", "2026-06-14T10:00:00.000Z")],
      new Date("2026-06-14T10:02:00.000Z"),
    );
    expect(state.active_session?.pending).toBe(true);
    expect(state.elapsed_seconds).toBe(120);
  });

  it("projects start and stop as idle pending history", () => {
    const state = projectTimerState(
      emptyTimerState(new Date("2026-06-14T10:00:00.000Z")),
      [
        event(1, "start", "2026-06-14T10:00:00.000Z"),
        event(2, "stop", "2026-06-14T10:05:00.000Z"),
      ],
      new Date("2026-06-14T10:06:00.000Z"),
    );
    expect(state.active_session).toBeNull();
    expect(state.elapsed_seconds).toBe(0);
  });
});
