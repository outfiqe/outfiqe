import { millisecondsInHour } from "date-fns/constants";
import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { bankQrVerificationController } from "./bank-qr-verification.controller.js";
import { bankQrPreviewBodySchema } from "./bank-qr-verification.schemas.js";

const PREVIEW_WINDOW_MS = millisecondsInHour;
const PREVIEW_MAX_REQUESTS = 30;

const previewBankQrRateLimit = rateLimit({
  namespace: "bank-qr-preview",
  windowMs: PREVIEW_WINDOW_MS,
  max: PREVIEW_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many QR reads. Please wait a moment and try again.",
});

export const bankQrVerificationRoutes = Router();

bankQrVerificationRoutes.post(
  "/preview",
  requireAuth,
  previewBankQrRateLimit,
  validate({ body: bankQrPreviewBodySchema }),
  bankQrVerificationController.preview,
);
