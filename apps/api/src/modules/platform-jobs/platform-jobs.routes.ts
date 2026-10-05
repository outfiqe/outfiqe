import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { platformJobsController } from "./platform-jobs.controller.js";
import { outboxEventIdParamSchema, queueNameParamSchema } from "./platform-jobs.schemas.js";

export const platformJobsRoutes = Router();

const jobsChain = [
  ...requirePlatformRole("platform:jobs:manage"),
  requirePlatformNavItem("platform-jobs"),
];

platformJobsRoutes.get("/jobs", ...jobsChain, platformJobsController.getHealth);

platformJobsRoutes.post(
  "/jobs/outbox/:eventId/retry",
  ...jobsChain,
  validate({ params: outboxEventIdParamSchema }),
  platformJobsController.retryOutboxEvent,
);

platformJobsRoutes.post(
  "/jobs/queues/:queueName/retry-failed",
  ...jobsChain,
  validate({ params: queueNameParamSchema }),
  platformJobsController.retryFailedJobs,
);
