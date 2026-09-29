import * as Sentry from "@sentry/node";
import { type Job, Worker } from "bullmq";

import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

import { OUTBOX_WORKER_CONCURRENCY_BY_QUEUE_NAME } from "./outbox.constants.js";
import { findOutboxHandler } from "./outbox.handlers.js";
import { workerConnection } from "./outbox.queues.js";
import type { OutboxJobData, OutboxQueueName } from "./outbox.types.js";

const FIRST_ATTEMPT = 1;

const runningWorkers: Worker<OutboxJobData>[] = [];

export const processOutboxJob = async (job: Job<OutboxJobData>): Promise<void> => {
  const handler = findOutboxHandler(job.name);
  if (!handler) {
    logger.warn(`No outbox handler for "${job.name}"; job ${job.id} completed without work`);
    return;
  }
  await handler(job.data);
};

const hasExhaustedAttempts = (job: Job<OutboxJobData>): boolean =>
  job.attemptsMade >= (job.opts.attempts ?? FIRST_ATTEMPT);

const reportFailedJob = (job: Job<OutboxJobData> | undefined, error: Error): void => {
  if (!job) return;
  if (!hasExhaustedAttempts(job)) {
    logger.warn(`Outbox job ${job.name}/${job.id} failed, will retry: ${describeError(error)}`);
    return;
  }
  logger.error(
    `Outbox job ${job.name}/${job.id} failed after ${job.attemptsMade} attempts: ${describeError(error)}`,
  );
  Sentry.captureException(error, { extra: { outboxEventId: job.id, topic: job.name } });
};

export const startOutboxWorkers = (queueNames: readonly OutboxQueueName[]): void => {
  for (const queueName of queueNames) {
    const worker = new Worker<OutboxJobData>(queueName, processOutboxJob, {
      connection: workerConnection(),
      concurrency: OUTBOX_WORKER_CONCURRENCY_BY_QUEUE_NAME[queueName],
    });
    worker.on("failed", reportFailedJob);
    runningWorkers.push(worker);
  }
};

export const stopOutboxWorkers = async (): Promise<void> => {
  const workers = runningWorkers.splice(0);
  await Promise.all(workers.map((worker) => worker.close()));
};
