const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const formatNotificationTimestamp = (isoDate: string, now: Date = new Date()): string => {
  const then = new Date(isoDate);
  const elapsedMs = now.getTime() - then.getTime();

  if (elapsedMs < MINUTE_MS) return "now";
  if (elapsedMs < HOUR_MS) return `${Math.floor(elapsedMs / MINUTE_MS)}m`;
  if (elapsedMs < DAY_MS) return `${Math.floor(elapsedMs / HOUR_MS)}h`;

  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
