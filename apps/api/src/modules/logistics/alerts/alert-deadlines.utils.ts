import { TZDate } from "@date-fns/tz";
import { addDays } from "date-fns/addDays";
import { format } from "date-fns/format";
import { getDay } from "date-fns/getDay";
import { isAfter } from "date-fns/isAfter";
import { parseISO } from "date-fns/parseISO";
import { subDays } from "date-fns/subDays";

import type { WorkingCalendar } from "#lib/working-days.utils.js";

const NEXT_DAY_STEP = 1;
const NO_WORKING_DAYS_LEFT = 0;
const NO_DAYS_LEFT_TO_SEARCH = 0;
const CALENDAR_DATE_FORMAT = "yyyy-MM-dd";
const TIME_PARTS_SEPARATOR = ":";
const START_OF_HOUR = 0;
const DAYS_TO_SEARCH_FOR_A_COLLECTION = 14;

export type HubCalendar = WorkingCalendar & { partnerCollectionTime: string };

const isWorkingDay = (day: TZDate, { workingDays }: WorkingCalendar): boolean =>
  workingDays.includes(getDay(day));

const nextWorkingDay = (day: TZDate, calendar: WorkingCalendar): TZDate => {
  const followingDay = addDays(day, NEXT_DAY_STEP);
  return isWorkingDay(followingDay, calendar)
    ? followingDay
    : nextWorkingDay(followingDay, calendar);
};

const advanceWorkingDays = (
  day: TZDate,
  workingDaysLeft: number,
  calendar: WorkingCalendar,
): TZDate =>
  workingDaysLeft <= NO_WORKING_DAYS_LEFT
    ? day
    : advanceWorkingDays(nextWorkingDay(day, calendar), workingDaysLeft - NEXT_DAY_STEP, calendar);

export const addHubWorkingDays = (
  from: Date,
  workingDayCount: number,
  calendar: WorkingCalendar,
): Date =>
  new Date(
    advanceWorkingDays(new TZDate(from, calendar.timeZone), workingDayCount, calendar).getTime(),
  );

const atLocalTime = (day: TZDate, localTime: string, timeZone: string): TZDate => {
  const [hours = START_OF_HOUR, minutes = START_OF_HOUR] = localTime
    .split(TIME_PARTS_SEPARATOR)
    .map(Number);
  return new TZDate(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, timeZone);
};

const findCollectionFrom = (
  day: TZDate,
  after: Date,
  calendar: HubCalendar,
  daysLeftToSearch: number,
): Date | null => {
  if (daysLeftToSearch <= NO_DAYS_LEFT_TO_SEARCH) return null;
  const collection = atLocalTime(day, calendar.partnerCollectionTime, calendar.timeZone);
  if (isWorkingDay(day, calendar) && isAfter(collection, after)) {
    return new Date(collection.getTime());
  }
  return findCollectionFrom(
    addDays(day, NEXT_DAY_STEP),
    after,
    calendar,
    daysLeftToSearch - NEXT_DAY_STEP,
  );
};

export const nextPartnerCollectionAfter = (from: Date, calendar: HubCalendar): Date | null =>
  findCollectionFrom(
    new TZDate(from, calendar.timeZone),
    from,
    calendar,
    DAYS_TO_SEARCH_FOR_A_COLLECTION,
  );

export const localCalendarDate = (moment: Date, timeZone: string): string =>
  format(new TZDate(moment, timeZone), CALENDAR_DATE_FORMAT);

export const calendarDateBefore = (calendarDate: string, daysBefore: number): string =>
  format(subDays(parseISO(calendarDate), daysBefore), CALENDAR_DATE_FORMAT);
