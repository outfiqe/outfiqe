import { millisecondsInHour, millisecondsInMinute } from "date-fns/constants";
export const RECONCILE_CHECK_INTERVAL_MS = 5 * millisecondsInMinute;
export const RECONCILE_CHECK_AFTER_MS = 5 * millisecondsInMinute;
export const RECONCILE_EXPIRE_AFTER_MS = millisecondsInHour;
export const VERIFIABLE_ATTEMPTS_LIMIT = 5;
export const SUPERSEDED_BY_RETRY_MARKER = "supersededByRetry";
