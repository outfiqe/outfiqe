import { SECONDS_PER_DAY, SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from "@outfiqe/utils";
export const formatRupees = (amount: number): string => `Rs. ${amount.toLocaleString()}`;

export { formatDate, formatDateTime } from "@outfiqe/utils";

export const formatDuration = (seconds: number | null): string => {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < SECONDS_PER_MINUTE) return "<1m";

  if (seconds >= SECONDS_PER_DAY) {
    const days = Math.floor(seconds / SECONDS_PER_DAY);
    const hours = Math.round((seconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (seconds >= SECONDS_PER_HOUR) {
    const hours = Math.floor(seconds / SECONDS_PER_HOUR);
    const minutes = Math.round((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${Math.round(seconds / SECONDS_PER_MINUTE)}m`;
};
