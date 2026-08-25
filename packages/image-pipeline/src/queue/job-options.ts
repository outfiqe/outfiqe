import type { JobsOptions } from "bullmq";

import { pipelineConfig } from "../config/pipeline.config.js";
import type { ImageJobPriorityTier } from "./priority.constants.js";
import { priorityValueForTier } from "./priority.constants.js";

const COMPLETED_JOB_RETENTION_SECONDS = 24 * 60 * 60;

export const buildImageJobOptions = (
  jobId: string,
  priorityTier: ImageJobPriorityTier,
): JobsOptions => ({
  jobId,
  priority: priorityValueForTier(priorityTier),
  attempts: pipelineConfig.retry.maxAttempts,
  backoff: {
    type: "exponential",
    delay: pipelineConfig.retry.backoffBaseDelayMs,
    jitter: pipelineConfig.retry.backoffJitter,
  },
  removeOnComplete: { age: COMPLETED_JOB_RETENTION_SECONDS },
  removeOnFail: false,
});
