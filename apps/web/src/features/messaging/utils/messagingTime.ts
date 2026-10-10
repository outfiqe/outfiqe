import { format } from "date-fns/format";
import { isToday } from "date-fns/isToday";
import { isYesterday } from "date-fns/isYesterday";

import { formatRelativeTime } from "@/shared/lib/formatRelativeTime";

const CLOCK_TIME_FORMAT = "h:mm a";
const FULL_DATE_FORMAT = "MMMM d, yyyy";

export const formatMessageClock = (isoDate: string): string =>
  format(new Date(isoDate), CLOCK_TIME_FORMAT);

export const formatMessageDateSeparator = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, FULL_DATE_FORMAT);
};

export const formatLastSeen = (lastSeenAt: string | null): string =>
  lastSeenAt ? `Active ${formatRelativeTime(lastSeenAt)} ago` : "Offline";
