import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";

const ONE_MINUTE_MS = 60 * 1000;
const STAFF_WRITES_PER_MINUTE = 60;
const BRAND_WRITES_PER_MINUTE = 20;
const RIDER_SCANS_PER_MINUTE = 120;
const HUB_SCANS_PER_MINUTE = 120;

export const logisticsStaffWriteRateLimit = rateLimit({
  namespace: "logistics-staff-write",
  windowMs: ONE_MINUTE_MS,
  max: STAFF_WRITES_PER_MINUTE,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many changes in a short time. Please wait a moment and try again.",
});

export const logisticsRiderScanRateLimit = rateLimit({
  namespace: "logistics-rider-scan",
  windowMs: ONE_MINUTE_MS,
  max: RIDER_SCANS_PER_MINUTE,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many scans in a short time. Please wait a moment and try again.",
});

export const logisticsBrandWriteRateLimit = rateLimit({
  namespace: "logistics-brand-write",
  windowMs: ONE_MINUTE_MS,
  max: BRAND_WRITES_PER_MINUTE,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many changes in a short time. Please wait a moment and try again.",
});

export const logisticsHubScanRateLimit = rateLimit({
  namespace: "logistics-hub-scan",
  windowMs: ONE_MINUTE_MS,
  max: HUB_SCANS_PER_MINUTE,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many scans in a short time. Please wait a moment and try again.",
});
