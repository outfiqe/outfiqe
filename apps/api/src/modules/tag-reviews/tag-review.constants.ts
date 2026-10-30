import { millisecondsInDay } from "date-fns/constants";

export const TAG_REVIEW_SLA_DAYS = 7;
export const TAG_REVIEW_SLA_SWEEP_INTERVAL_MS = millisecondsInDay;

export const TAG_REVIEW_REMINDER_MIN_AGE_HOURS = 24;
const TAG_REVIEW_REMINDER_INTERVAL_DAYS = 3;
export const TAG_REVIEW_REMINDER_INTERVAL_MS =
  TAG_REVIEW_REMINDER_INTERVAL_DAYS * millisecondsInDay;

export const TAG_REVIEW_RESPONSE_MESSAGES = {
  queue: "Tag review queue.",
  pendingCount: "Pending tag review count.",
  metrics: "Tag review metrics.",
  approved: "Tag approved.",
  removed: "Tag removed.",
} as const;
