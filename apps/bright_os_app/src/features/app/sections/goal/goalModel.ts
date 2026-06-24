import type { GoalData } from "@/shared/types/timer";

export type GoalChartRow = {
  date: string;
  completedSeconds: number;
  percentage: number;
  achieved: boolean;
  "Цель выполнена": number;
  "Время фокуса": number;
};

export type GoalSectionView = {
  todayCompletedSeconds: number;
  todayPercentage: number;
  closedDays: number;
  chartData: GoalChartRow[];
};

export function goalSectionView(goal: GoalData, todayKey: string): GoalSectionView {
  const today = goal.days.find((day) => day.date === todayKey) ?? goal.days[0];
  return {
    todayCompletedSeconds: today?.completed_seconds ?? 0,
    todayPercentage: today?.percentage ?? 0,
    closedDays: goal.days.filter((day) => day.achieved).length,
    chartData: goal.days.map((day) => {
      const completedHours = Math.round((day.completed_seconds / 3600) * 10) / 10;
      return {
        date: formatGoalChartDate(day.date),
        completedSeconds: day.completed_seconds,
        percentage: day.percentage,
        achieved: day.achieved,
        "Цель выполнена": day.achieved ? completedHours : 0,
        "Время фокуса": day.achieved ? 0 : completedHours,
      };
    }),
  };
}

export function formatGoalChartDate(date: string): string {
  const [, month, day] = date.split("-");
  return month && day ? `${day}-${month}` : date;
}
