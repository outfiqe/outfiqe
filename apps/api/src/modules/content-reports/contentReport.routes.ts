import { Router } from "express";

import { optionalAuth } from "#middlewares/optional-auth.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";

import { contentReportController } from "./contentReport.controller.js";
import {
  contentReportIdParamSchema,
  listContentReportsQuerySchema,
  resolveContentReportSchema,
  submitContentReportSchema,
} from "./contentReport.schemas.js";

const REPORT_WINDOW_MS = 60 * 60 * 1000;
const REPORT_MAX_PER_IP = 10;

const reportRateLimit = rateLimit({
  namespace: "content-report-submit",
  windowMs: REPORT_WINDOW_MS,
  max: REPORT_MAX_PER_IP,
  keyGenerator: (req) => req.ip,
  message: "You've reported a lot of content recently. Please try again later.",
});

const requireAdmin = [requireAuth, requirePlatformAccess];

export const contentReportRoutes = Router();

contentReportRoutes.post(
  "/",
  optionalAuth,
  reportRateLimit,
  validate({ body: submitContentReportSchema }),
  contentReportController.submit,
);

contentReportRoutes.get("/open-count", ...requireAdmin, contentReportController.openCount);

contentReportRoutes.get(
  "/",
  ...requireAdmin,
  validate({ query: listContentReportsQuerySchema }),
  contentReportController.list,
);

contentReportRoutes.post(
  "/:id/resolve",
  ...requireAdmin,
  validate({ params: contentReportIdParamSchema, body: resolveContentReportSchema }),
  contentReportController.resolve,
);
