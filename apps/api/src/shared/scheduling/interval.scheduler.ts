import * as Sentry from "@sentry/node";

import logger from "#lib/winston.utils.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";

import type { BoundaryJob, Job, RecurringJob } from "./scheduler.types.js";

const LOCK_TTL_MS = 30_000;

const runJob = async (job: Job): Promise<void> => {
  const lockKey = redisKeys.lock(job.name);
  const acquired = await redis.set(lockKey, "1", "PX", LOCK_TTL_MS, "NX");
  if (!acquired) return;

  try {
    await job.run();
  } catch (error) {
    logger.error(`Scheduled job "${job.name}" failed: ${String(error)}`);
    Sentry.captureException(error);
  } finally {
    await redis.del(lockKey);
  }
};

export const startIntervalScheduler = (jobs: RecurringJob[]): void => {
  for (const job of jobs) {
    setInterval(() => void runJob(job), job.intervalMs);
  }
};

const armBoundaryJob = (job: BoundaryJob): void => {
  const delayMs = Math.max(job.nextRunAt(new Date()).getTime() - Date.now(), 0);
  setTimeout(() => {
    void runJob(job).finally(() => armBoundaryJob(job));
  }, delayMs);
};

export const startBoundaryScheduler = (jobs: BoundaryJob[]): void => {
  for (const job of jobs) {
    armBoundaryJob(job);
  }
};
