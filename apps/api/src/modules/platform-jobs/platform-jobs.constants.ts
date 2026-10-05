import { minutesToMilliseconds } from "date-fns/minutesToMilliseconds";

export const PLATFORM_JOBS_LIMITS = {
  STUCK_EVENTS_SHOWN: 50,
  FAILED_JOBS_RETRIED_PER_REQUEST: 500,
} as const;

export const QUEUE_DASHBOARD_PATH = "/internal/queues";

export const OUTBOX_BACKLOG_ALERT = {
  MAX_WAITING_EVENTS: 1_000,
  MAX_OLDEST_WAIT_MINUTES: 5,
  CHECK_INTERVAL_MS: minutesToMilliseconds(5),
} as const;

export const PLATFORM_JOBS_AUDIT_TARGET_TYPE = {
  OUTBOX_EVENT: "OutboxEvent",
  QUEUE: "Queue",
} as const;
