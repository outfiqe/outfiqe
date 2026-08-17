import { differenceInDays } from "date-fns/differenceInDays";
import { differenceInHours } from "date-fns/differenceInHours";
import { differenceInMinutes } from "date-fns/differenceInMinutes";
import { differenceInMonths } from "date-fns/differenceInMonths";
import { differenceInWeeks } from "date-fns/differenceInWeeks";
import { differenceInYears } from "date-fns/differenceInYears";

const WEEKS_PER_MONTH = 4;
const MONTHS_PER_YEAR = 12;

export const formatRelativeTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();

  const minutes = differenceInMinutes(now, date);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;

  const hours = differenceInHours(now, date);
  if (hours < 24) return `${hours}h`;

  const days = differenceInDays(now, date);
  if (days < 7) return `${days}d`;

  const weeks = differenceInWeeks(now, date);
  if (weeks < WEEKS_PER_MONTH) return `${weeks}w`;

  const months = differenceInMonths(now, date);
  if (months < MONTHS_PER_YEAR) return `${months}mo`;

  return `${differenceInYears(now, date)}y`;
};
