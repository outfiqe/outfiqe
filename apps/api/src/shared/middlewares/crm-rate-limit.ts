import { getAuthPrincipal } from "#middlewares/require-auth.js";

import { rateLimit } from "./rate-limit.js";

const CRM_WRITE_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const CRM_WRITE_RATE_LIMIT_MAX_REQUESTS = 120;

export const crmWriteRateLimit = rateLimit({
  namespace: "crm-write",
  windowMs: CRM_WRITE_RATE_LIMIT_WINDOW_MS,
  max: CRM_WRITE_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many CRM changes in a short time. Please slow down.",
});
