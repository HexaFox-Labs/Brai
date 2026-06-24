import { describe, expect, it } from "vitest";
import { formatDuration, formatGoalDuration, formatHumanDuration, formatPercent, moscowDateTime } from "@/shared/time/format";

describe("time formatting", () => {
  it("formats timer digits", () => {
    expect(formatDuration(3723)).toBe("01:02:03");
  });

  it("formats human durations in Russian units", () => {
    expect(formatHumanDuration(43200)).toBe("12 ч");
    expect(formatHumanDuration(5400)).toBe("1 ч 30 мин");
  });

  it("formats goal durations compactly", () => {
    expect(formatGoalDuration(0)).toBe("0м");
    expect(formatGoalDuration(1800)).toBe("30м");
    expect(formatGoalDuration(3600)).toBe("1ч");
    expect(formatGoalDuration(3900)).toBe("1ч 5м");
  });

  it("formats precise small percentages", () => {
    expect(formatPercent(0.42)).toBe("0,4%");
    expect(formatPercent(124.3)).toBe("124%");
  });

  it("uses Moscow time labels", () => {
    expect(moscowDateTime("2026-06-13T19:35:12.000Z")).toBe("2026-06-13 22:35");
  });
});
