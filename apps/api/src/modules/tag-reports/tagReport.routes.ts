import { Router } from "express";

import { optionalAuth } from "#middlewares/optional-auth.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";

import { tagReportController } from "./tagReport.controller.js";
import {
  listTagReportsQuerySchema,
  resolveTagReportSchema,
  submitTagReportSchema,
  tagReportIdParamSchema,
} from "./tagReport.schemas.js";

const REPORT_WINDOW_MS = 60 * 60 * 1000;
const REPORT_MAX_PER_IP = 10;

const reportRateLimit = rateLimit({
  namespace: "tag-report-submit",
  windowMs: REPORT_WINDOW_MS,
  max: REPORT_MAX_PER_IP,
  keyGenerator: (req) => req.ip,
  message: "You've reported a lot of tags recently. Please try again later.",
});

const requireAdmin = [requireAuth, requirePlatformAccess];

export const tagReportRoutes = Router();

tagReportRoutes.post(
  "/",
  optionalAuth,
  reportRateLimit,
  validate({ body: submitTagReportSchema }),
  tagReportController.submit,
);

tagReportRoutes.get("/open-count", ...requireAdmin, tagReportController.openCount);

tagReportRoutes.get(
  "/",
  ...requireAdmin,
  validate({ query: listTagReportsQuerySchema }),
  tagReportController.list,
);

tagReportRoutes.post(
  "/:id/resolve",
  ...requireAdmin,
  validate({ params: tagReportIdParamSchema, body: resolveTagReportSchema }),
  tagReportController.resolve,
);
