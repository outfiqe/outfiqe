import * as Sentry from "@sentry/node";

import logger from "#lib/winston.utils.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";

import type { RecurringJob } from "./scheduler.types.js";

const LOCK_TTL_MS = 30_000;

const runJob = async (job: RecurringJob): Promise<void> => {
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
