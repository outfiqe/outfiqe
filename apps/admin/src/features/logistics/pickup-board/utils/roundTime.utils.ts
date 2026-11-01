const HOURS_AND_MINUTES_SEPARATOR = ":";
const DATE_TIME_LOCAL_LENGTH = 16;
const PAD_LENGTH = 2;
const PAD_CHARACTER = "0";
const MONTH_OFFSET = 1;
const START_OF_MINUTE_SECONDS = 0;
const START_OF_SECOND_MILLISECONDS = 0;

const padTwoDigits = (value: number) => String(value).padStart(PAD_LENGTH, PAD_CHARACTER);

export const toDateTimeLocalValue = (date: Date): string =>
  `${date.getFullYear()}-${padTwoDigits(date.getMonth() + MONTH_OFFSET)}-${padTwoDigits(date.getDate())}T${padTwoDigits(date.getHours())}:${padTwoDigits(date.getMinutes())}`;

export const roundTimeToday = (roundTime: string, today: Date): string => {
  const [hours = PAD_CHARACTER, minutes = PAD_CHARACTER] = roundTime.split(
    HOURS_AND_MINUTES_SEPARATOR,
  );
  const roundStart = new Date(today);
  roundStart.setHours(
    Number(hours),
    Number(minutes),
    START_OF_MINUTE_SECONDS,
    START_OF_SECOND_MILLISECONDS,
  );
  return toDateTimeLocalValue(roundStart);
};

export const isCompleteDateTimeLocal = (value: string): boolean =>
  value.length === DATE_TIME_LOCAL_LENGTH && !Number.isNaN(new Date(value).getTime());

export const formatRoundStart = (roundStartsAt: string): string => formatDateTime(roundStartsAt);
import { formatDateTime } from "@outfiqe/utils";
