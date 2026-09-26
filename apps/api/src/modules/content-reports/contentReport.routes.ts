import { Router } from "express";

import { optionalAuth } from "#middlewares/optional-auth.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

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

export const contentReportRoutes = Router();

contentReportRoutes.post(
  "/",
  optionalAuth,
  reportRateLimit,
  validate({ body: submitContentReportSchema }),
  contentReportController.submit,
);

contentReportRoutes.get(
  "/open-count",
  ...platformGuards.contentModerate,
  contentReportController.openCount,
);

contentReportRoutes.get(
  "/",
  ...platformGuards.contentModerate,
  validate({ query: listContentReportsQuerySchema }),
  contentReportController.list,
);

contentReportRoutes.post(
  "/:id/resolve",
  ...platformGuards.contentModerate,
  validate({ params: contentReportIdParamSchema, body: resolveContentReportSchema }),
  contentReportController.resolve,
);
