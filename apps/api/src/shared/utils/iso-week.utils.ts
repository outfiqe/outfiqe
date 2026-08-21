import { addWeeks } from "date-fns/addWeeks";
import { getISOWeek } from "date-fns/getISOWeek";
import { getISOWeekYear } from "date-fns/getISOWeekYear";
import { startOfISOWeek } from "date-fns/startOfISOWeek";
import { subWeeks } from "date-fns/subWeeks";

const WEEK_LABEL_PAD_LENGTH = 2;

export const isoWeekKey = (date: Date): string => {
  const year = getISOWeekYear(date);
  const week = String(getISOWeek(date)).padStart(WEEK_LABEL_PAD_LENGTH, "0");
  return `${year}-W${week}`;
};

export const currentIsoWeekKey = (now: Date): string => isoWeekKey(now);

export const previousIsoWeekKey = (now: Date): string => isoWeekKey(subWeeks(now, 1));

export const currentIsoWeekStart = (now: Date): Date => startOfISOWeek(now);

export const nextIsoWeekStart = (now: Date): Date => addWeeks(startOfISOWeek(now), 1);
