import { TZDate } from "@date-fns/tz";
import { addDays } from "date-fns/addDays";
import { format } from "date-fns/format";
import { getDay } from "date-fns/getDay";
import { startOfDay } from "date-fns/startOfDay";

export type WorkingCalendar = {
  timeZone: string;
  workingDays: readonly number[];
};

const NEXT_DAY_STEP = 1;
const NO_WORKING_DAYS_LEFT = 0;
const CALENDAR_DATE_FORMAT = "yyyy-MM-dd";
const UTC_TIME_ZONE = "UTC";

const nextWorkingDay = (day: TZDate, calendar: WorkingCalendar): TZDate => {
  const followingDay = addDays(day, NEXT_DAY_STEP);
  return calendar.workingDays.includes(getDay(followingDay))
    ? followingDay
    : nextWorkingDay(followingDay, calendar);
};

const advanceWorkingDays = (
  day: TZDate,
  workingDaysLeft: number,
  calendar: WorkingCalendar,
): TZDate =>
  workingDaysLeft === NO_WORKING_DAYS_LEFT
    ? day
    : advanceWorkingDays(nextWorkingDay(day, calendar), workingDaysLeft - NEXT_DAY_STEP, calendar);

export const addWorkingDaysAsCalendarDate = (
  from: Date,
  workingDayCount: number,
  calendar: WorkingCalendar,
): string => {
  const localStartOfDay = startOfDay(new TZDate(from, calendar.timeZone));
  return format(
    advanceWorkingDays(localStartOfDay, workingDayCount, calendar),
    CALENDAR_DATE_FORMAT,
  );
};

export const calendarDateToUtcMidnight = (calendarDate: string): Date =>
  new Date(`${calendarDate}T00:00:00.000Z`);

export const utcMidnightToCalendarDate = (utcMidnight: Date): string =>
  format(new TZDate(utcMidnight, UTC_TIME_ZONE), CALENDAR_DATE_FORMAT);
