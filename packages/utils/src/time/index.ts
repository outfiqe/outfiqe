export const MS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;

export const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
export const SECONDS_PER_DAY = SECONDS_PER_HOUR * HOURS_PER_DAY;

export const MS_PER_MINUTE = SECONDS_PER_MINUTE * MS_PER_SECOND;
export const MS_PER_HOUR = SECONDS_PER_HOUR * MS_PER_SECOND;
export const MS_PER_DAY = SECONDS_PER_DAY * MS_PER_SECOND;

type DisplayableDate = string | Date | null | undefined;

const MISSING_DATE_LABEL = "—";

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
const shortDateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

const buildDateLabel = (formatter: Intl.DateTimeFormat, date: DisplayableDate): string => {
  if (!date) return MISSING_DATE_LABEL;
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime()) ? MISSING_DATE_LABEL : formatter.format(parsedDate);
};

export const formatDate = (date: DisplayableDate): string => buildDateLabel(dateFormatter, date);

export const formatDateTime = (date: DisplayableDate): string =>
  buildDateLabel(dateTimeFormatter, date);

export const formatShortDate = (date: DisplayableDate): string =>
  buildDateLabel(shortDateFormatter, date);
