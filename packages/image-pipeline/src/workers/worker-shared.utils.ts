import type { ConnectionOptions, Job, WorkerOptions } from "bullmq";

import { pipelineConfig } from "../config/pipeline.config.js";
import type { PipelineLogger } from "./pipeline-logger.types.js";

export const buildWorkerOptions = (
  connection: ConnectionOptions,
  concurrency: number,
): WorkerOptions => {
  const { lockDurationMs, stalledIntervalMs } = pipelineConfig.jobLifecycle;
  const { max, durationMs } = pipelineConfig.rateLimit;

  return {
    connection,
    concurrency,
    lockDuration: lockDurationMs,
    stalledInterval: stalledIntervalMs,
    limiter: { max, duration: durationMs },
  };
};

export type JobInput<TData> = Pick<Job<TData>, "data">;
export type StageJobInput<TData> = Pick<Job<TData>, "data" | "id" | "attemptsMade">;

export const withStageLogging = <TData, TResult>(
  stageName: string,
  logger: PipelineLogger,
  processor: (job: StageJobInput<TData>) => Promise<TResult>,
) => {
  return async (job: StageJobInput<TData>): Promise<TResult> => {
    const { id: jobId, attemptsMade } = job;
    const startedAtMs = Date.now();
    try {
      const result = await processor(job);
      logger.info(`image-pipeline: ${stageName} stage completed`, {
        stage: stageName,
        jobId,
        attemptsMade,
        durationMs: Date.now() - startedAtMs,
      });
      return result;
    } catch (error) {
      logger.error(`image-pipeline: ${stageName} stage failed`, {
        stage: stageName,
        jobId,
        attemptsMade,
        durationMs: Date.now() - startedAtMs,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
};
