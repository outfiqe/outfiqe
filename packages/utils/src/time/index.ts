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

const DATE_INPUT_VALUE_LENGTH = "YYYY-MM-DD".length;
const DATE_TIME_INPUT_VALUE_LENGTH = "YYYY-MM-DDTHH:mm".length;

const toLocalIsoText = (date: Date): string =>
  new Date(date.getTime() - date.getTimezoneOffset() * MS_PER_MINUTE).toISOString();

export const toDateInputValue = (date: Date = new Date()): string =>
  toLocalIsoText(date).slice(0, DATE_INPUT_VALUE_LENGTH);

export const toDateTimeInputValue = (date: Date = new Date()): string =>
  toLocalIsoText(date).slice(0, DATE_TIME_INPUT_VALUE_LENGTH);

export const toDayStartIso = (dateInputValue: string): string =>
  new Date(`${dateInputValue}T00:00:00`).toISOString();

export const toDayEndIso = (dateInputValue: string): string =>
  new Date(`${dateInputValue}T23:59:59.999`).toISOString();

export const isPastDateInputValue = (dateInputValue: string): boolean =>
  dateInputValue !== "" && dateInputValue < toDateInputValue();

export const isPastDateTimeInputValue = (dateTimeInputValue: string): boolean =>
  dateTimeInputValue !== "" && dateTimeInputValue < toDateTimeInputValue();
