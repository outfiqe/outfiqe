import express, { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { logisticsStaffWriteRateLimit } from "../logistics.rate-limits.js";
import { logisticsPartnerWebhookController } from "./partner-webhook.controller.js";
import {
  listWebhookReceiptsQuerySchema,
  partnerReceiptsParamSchema,
  partnerWebhookParamSchema,
  replayWebhookReceiptsSchema,
} from "./partner-webhook.schemas.js";

const ONE_MINUTE_MS = 60 * 1000;
const WEBHOOKS_PER_MINUTE_PER_SENDER = 300;
const MAX_WEBHOOK_BODY_SIZE = "256kb";

const partnerWebhookRateLimit = rateLimit({
  namespace: "logistics-partner-webhook",
  windowMs: ONE_MINUTE_MS,
  max: WEBHOOKS_PER_MINUTE_PER_SENDER,
  keyGenerator: (req) => `${req.params.partnerCode ?? "unknown"}:${req.ip ?? "unknown"}`,
  message: "Too many updates in a short time.",
});

export const partnerWebhookRoutes = Router();

partnerWebhookRoutes.post(
  "/:partnerCode",
  partnerWebhookRateLimit,
  express.raw({ type: () => true, limit: MAX_WEBHOOK_BODY_SIZE }),
  validate({ params: partnerWebhookParamSchema }),
  logisticsPartnerWebhookController.receive,
);

export const partnerWebhookReceiptRoutes = Router({ mergeParams: true });

partnerWebhookReceiptRoutes.get(
  "/",
  ...platformGuards.logisticsRead,
  validate({ params: partnerReceiptsParamSchema, query: listWebhookReceiptsQuerySchema }),
  logisticsPartnerWebhookController.listReceipts,
);

partnerWebhookReceiptRoutes.post(
  "/replay",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: partnerReceiptsParamSchema, body: replayWebhookReceiptsSchema }),
  logisticsPartnerWebhookController.replay,
);
