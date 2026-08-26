import type { BackPressureDecision, EnqueueImageProcessingParams } from "@outfiqe/image-pipeline";
import {
  checkBackPressure,
  createImageProcessingQueues,
  createQueueRedisConnectionOptions,
  enqueueImageProcessing,
  pipelineConfig,
} from "@outfiqe/image-pipeline";

export const imageQueueRedisConnection = createQueueRedisConnectionOptions();

export const imageProcessingQueues = createImageProcessingQueues(imageQueueRedisConnection);

export const checkImageIngestBackPressure = async (): Promise<BackPressureDecision> => {
  const { waiting, active, delayed } = await imageProcessingQueues.ingest.getJobCounts(
    "waiting",
    "active",
    "delayed",
  );
  const { maxQueueDepth, retryAfterSeconds } = pipelineConfig.backPressure;

  return checkBackPressure(
    { waiting: waiting ?? 0, active: active ?? 0, delayed: delayed ?? 0 },
    maxQueueDepth,
    retryAfterSeconds,
  );
};

export const enqueueImageProcessingJob = (params: EnqueueImageProcessingParams): Promise<void> =>
  enqueueImageProcessing(imageQueueRedisConnection, params);
