import { millisecondsInMinute } from "date-fns/constants";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";

const STAFF_WRITES_PER_MINUTE = 60;
const BRAND_WRITES_PER_MINUTE = 20;
const RIDER_SCANS_PER_MINUTE = 120;
const HUB_SCANS_PER_MINUTE = 120;
const COD_ELIGIBILITY_CHECKS_PER_MINUTE = 20;

export const logisticsStaffWriteRateLimit = rateLimit({
  namespace: "logistics-staff-write",
  windowMs: millisecondsInMinute,
  max: STAFF_WRITES_PER_MINUTE,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many changes in a short time. Please wait a moment and try again.",
});

export const logisticsRiderScanRateLimit = rateLimit({
  namespace: "logistics-rider-scan",
  windowMs: millisecondsInMinute,
  max: RIDER_SCANS_PER_MINUTE,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many scans in a short time. Please wait a moment and try again.",
});

export const logisticsBrandWriteRateLimit = rateLimit({
  namespace: "logistics-brand-write",
  windowMs: millisecondsInMinute,
  max: BRAND_WRITES_PER_MINUTE,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many changes in a short time. Please wait a moment and try again.",
});

export const codEligibilityRateLimit = rateLimit({
  namespace: "logistics-cod-eligibility",
  windowMs: millisecondsInMinute,
  max: COD_ELIGIBILITY_CHECKS_PER_MINUTE,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many checks in a short time. Please wait a moment and try again.",
});

export const logisticsHubScanRateLimit = rateLimit({
  namespace: "logistics-hub-scan",
  windowMs: millisecondsInMinute,
  max: HUB_SCANS_PER_MINUTE,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many scans in a short time. Please wait a moment and try again.",
});
