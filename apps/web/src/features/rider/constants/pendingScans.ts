export const PENDING_SCANS_STORAGE_KEY_PREFIX = "outfiqe-rider-pending-scans";

export const PENDING_SCAN_RETRY_INTERVAL_MS = 30_000;

export const PENDING_SCAN_STATE = {
  WAITING: "waiting",
  FAILED: "failed",
} as const;

export type PendingScanState = (typeof PENDING_SCAN_STATE)[keyof typeof PENDING_SCAN_STATE];

export const RETRYABLE_SCAN_ERROR_CODES: ReadonlySet<string> = new Set([
  "UNKNOWN_ERROR",
  "RATE_LIMITED",
  "DUPLICATE_REQUEST",
]);
