import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";

import {
  MAX_SUPPORT_REPLIES_PER_WINDOW,
  MAX_SUPPORT_TICKETS_PER_WINDOW,
  SUPPORT_REPLY_WINDOW_MS,
  SUPPORT_TICKET_CREATE_WINDOW_MS,
} from "./support.constants.js";

export const supportCreateRateLimit = rateLimit({
  namespace: "support-create",
  windowMs: SUPPORT_TICKET_CREATE_WINDOW_MS,
  max: MAX_SUPPORT_TICKETS_PER_WINDOW,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "You've opened several requests recently. Please wait before opening another.",
});

export const supportReplyRateLimit = rateLimit({
  namespace: "support-reply",
  windowMs: SUPPORT_REPLY_WINDOW_MS,
  max: MAX_SUPPORT_REPLIES_PER_WINDOW,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
});
