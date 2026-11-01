export const TASK_DUE_FILTERS = ["overdue", "today", "upcoming"] as const;
export type TaskDueFilter = (typeof TASK_DUE_FILTERS)[number];

const START_OF_DAY = [0, 0, 0, 0] as const;
const END_OF_DAY = [23, 59, 59, 999] as const;
const NEXT_DAY_STEP = 1;

const toStartOfDay = (date: Date): Date => {
  const dayStart = new Date(date);
  dayStart.setHours(...START_OF_DAY);
  return dayStart;
};

const toEndOfDay = (date: Date): Date => {
  const dayEnd = new Date(date);
  dayEnd.setHours(...END_OF_DAY);
  return dayEnd;
};

const toStartOfNextDay = (date: Date): Date => {
  const nextDay = toStartOfDay(date);
  nextDay.setDate(nextDay.getDate() + NEXT_DAY_STEP);
  return nextDay;
};

export const toTaskDueRange = (
  dueFilter: TaskDueFilter,
  now = new Date(),
): { dueFrom?: string; dueTo?: string } => {
  if (dueFilter === "overdue") return { dueTo: now.toISOString() };
  if (dueFilter === "today") {
    return {
      dueFrom: toStartOfDay(now).toISOString(),
      dueTo: toEndOfDay(now).toISOString(),
    };
  }
  return { dueFrom: toStartOfNextDay(now).toISOString() };
};

export const toDayRange = (dateText: string, boundary: "start" | "end"): string | undefined => {
  if (!dateText) return undefined;
  const localDate = new Date(`${dateText}T00:00:00`);
  return (boundary === "start" ? toStartOfDay(localDate) : toEndOfDay(localDate)).toISOString();
};
