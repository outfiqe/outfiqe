import type { ConnectionOptions, Queue } from "bullmq";
import { QueueEvents } from "bullmq";

import type { PipelineLogger } from "../workers/pipeline-logger.types.js";
import { noopPipelineLogger } from "../workers/pipeline-logger.types.js";

export type DeadLetterJobData = {
  stage: string;
  originalJobId: string;
  failedReason: string;
  jobData: unknown;
};

export const shouldMoveToDeadLetter = (attemptsMade: number, maxAttempts: number): boolean =>
  attemptsMade >= maxAttempts;

const DEFAULT_MAX_ATTEMPTS = 1;

export const attachDeadLetterOnExhaustion = (
  connection: ConnectionOptions,
  sourceQueue: Queue,
  deadLetterQueue: Queue,
  stageName: string,
  logger: PipelineLogger = noopPipelineLogger,
): QueueEvents => {
  const queueEvents = new QueueEvents(sourceQueue.name, { connection });

  queueEvents.on("failed", ({ jobId, failedReason }) => {
    void (async () => {
      const job = await sourceQueue.getJob(jobId);
      if (!job) {
        return;
      }
      const {
        opts: { attempts: maxAttempts = DEFAULT_MAX_ATTEMPTS },
        attemptsMade,
        data,
      } = job;
      if (!shouldMoveToDeadLetter(attemptsMade, maxAttempts)) {
        return;
      }

      const deadLetterJobData: DeadLetterJobData = {
        stage: stageName,
        originalJobId: jobId,
        failedReason,
        jobData: data,
      };
      await deadLetterQueue.add(stageName, deadLetterJobData);
      logger.error("image-pipeline: job moved to dead-letter queue after exhausting retries", {
        stage: stageName,
        jobId,
        failedReason,
        attemptsMade,
      });
    })();
  });

  return queueEvents;
};
