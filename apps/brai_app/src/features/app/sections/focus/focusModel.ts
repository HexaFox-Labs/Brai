import type { GoalData, HistoryData, TimerSession } from "@/shared/types/timer";

export type TimerClockParts = {
  hours: number;
  minutes: number;
  seconds: number;
};

export type HistoryGroupView = {
  date: string;
  sessions: TimerSession[];
  goalPercent: number;
  achieved: boolean;
  totalSeconds: number;
};

export function timerClockParts(seconds: number | null | undefined): TimerClockParts {
  const safe = Math.max(0, Math.floor(seconds ?? 0));
  return {
    hours: Math.floor(safe / 3600),
    minutes: Math.floor((safe % 3600) / 60),
    seconds: safe % 60,
  };
}

export function historyGroupsView(history: HistoryData, goal: GoalData): HistoryGroupView[] {
  return Object.keys(history.groups)
    .sort()
    .reverse()
    .map((date) => {
      const group = history.groups[date];
      const goalDay = goal.days.find((day) => day.date === date);
      return {
        date,
        sessions: sessionsForGroup(group),
        goalPercent: goalDay?.percentage ?? dailyGoalPercentage(group.total_seconds, goal.daily_goal_seconds),
        achieved: goalDay?.achieved ?? group.total_seconds >= goal.daily_goal_seconds,
        totalSeconds: group.total_seconds,
      };
    });
}

function dailyGoalPercentage(completedSeconds: number, dailyGoalSeconds: number) {
  if (dailyGoalSeconds <= 0) return 0;
  return (completedSeconds / dailyGoalSeconds) * 100;
}

function sessionsForGroup(group: HistoryData["groups"][string]): TimerSession[] {
  if (group.sessions) return group.sessions;
  return Object.keys(group.hours ?? {})
    .sort()
    .reverse()
    .flatMap((hour) => group.hours?.[hour]?.sessions ?? []);
}
