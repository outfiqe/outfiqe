import { hoursToMilliseconds } from "date-fns/hoursToMilliseconds";

export const OUTBOX_TOPIC = {
  STOCK_CHANGED: "stock.changed",
} as const;

export const OUTBOX_QUEUE_NAME = {
  REALTIME: "outbox-realtime",
  INVENTORY: "outbox-inventory",
  NOTIFY: "outbox-notify",
  ANALYTICS: "outbox-analytics",
} as const;

export const QUEUE_NAME_BY_OUTBOX_TOPIC = {
  [OUTBOX_TOPIC.STOCK_CHANGED]: OUTBOX_QUEUE_NAME.INVENTORY,
} as const;

export const REALTIME_OUTBOX_QUEUE_NAMES = [OUTBOX_QUEUE_NAME.REALTIME] as const;

export const BACKGROUND_OUTBOX_QUEUE_NAMES = [
  OUTBOX_QUEUE_NAME.INVENTORY,
  OUTBOX_QUEUE_NAME.NOTIFY,
  OUTBOX_QUEUE_NAME.ANALYTICS,
] as const;

export const OUTBOX_WORKER_CONCURRENCY_BY_QUEUE_NAME = {
  [OUTBOX_QUEUE_NAME.REALTIME]: 20,
  [OUTBOX_QUEUE_NAME.INVENTORY]: 5,
  [OUTBOX_QUEUE_NAME.NOTIFY]: 5,
  [OUTBOX_QUEUE_NAME.ANALYTICS]: 2,
} as const;

export const OUTBOX_RELAY_INTERVAL_MS = 500;
export const OUTBOX_RELAY_BATCH_SIZE = 100;
export const OUTBOX_RELAY_TRANSACTION_TIMEOUT_MS = 5_000;
export const OUTBOX_MAX_PUBLISH_ATTEMPTS = 10;
export const OUTBOX_LAST_ERROR_MAX_LENGTH = 500;

export const OUTBOX_JOB_ATTEMPTS = 5;
export const OUTBOX_JOB_BACKOFF_DELAY_MS = 1_000;
export const OUTBOX_JOB_BACKOFF_STRATEGY = "exponential";
export const OUTBOX_COMPLETED_JOBS_KEPT = 1_000;

export const OUTBOX_RETENTION_DAYS = 7;
export const OUTBOX_RETENTION_SWEEP_INTERVAL_MS = hoursToMilliseconds(1);
export const OUTBOX_RETENTION_DELETE_BATCH_SIZE = 1_000;
