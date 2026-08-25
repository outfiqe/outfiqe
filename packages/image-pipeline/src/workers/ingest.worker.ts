import type { ConnectionOptions, Queue } from "bullmq";
import { Worker } from "bullmq";

import { pipelineConfig } from "../config/pipeline.config.js";
import { validateImageBuffer } from "../processing/image-validation.js";
import { originalStorageKeyFor } from "../queue/content-addressed-key.utils.js";
import type { ImageAssetRepository } from "../queue/image-asset-repository.types.js";
import type { ImageIngestJobData, ImageIngestJobResult } from "../queue/image-job.types.js";
import { buildIdempotentJobId } from "../queue/job-id.utils.js";
import { buildImageJobOptions } from "../queue/job-options.js";
import { IMAGE_QUEUE_NAMES } from "../queue/queue-names.constants.js";
import type { StorageAdapter } from "../storage/storage-adapter.types.js";
import type { PipelineLogger } from "./pipeline-logger.types.js";
import { noopPipelineLogger } from "./pipeline-logger.types.js";
import type { JobInput } from "./worker-shared.utils.js";
import { buildWorkerOptions, withStageLogging } from "./worker-shared.utils.js";

export type ProcessIngestJobDeps = {
  tempStorageAdapter: StorageAdapter;
  outputStorageAdapter: StorageAdapter;
  assetRepository: ImageAssetRepository;
  thumbnailQueue: Pick<Queue, "add">;
};

export type CreateIngestWorkerDeps = ProcessIngestJobDeps & {
  connection: ConnectionOptions;
  logger?: PipelineLogger;
  concurrency?: number;
};

export const processIngestJob = async (
  job: JobInput<ImageIngestJobData>,
  deps: ProcessIngestJobDeps,
): Promise<ImageIngestJobResult> => {
  const { assetId, tempStorageKey, checksum, priorityTier, qualityTier } = job.data;
  const { tempStorageAdapter, outputStorageAdapter, assetRepository, thumbnailQueue } = deps;

  await assetRepository.markProcessing(assetId);

  const buffer = await tempStorageAdapter.get(tempStorageKey);
  const { format } = await validateImageBuffer(buffer);

  const originalStorageKey = originalStorageKeyFor(checksum, format);
  await outputStorageAdapter.put(originalStorageKey, buffer, {
    contentType: `image/${format}`,
  });
  await assetRepository.markIngestCompleted(assetId, originalStorageKey);

  const thumbnailJobId = buildIdempotentJobId({ checksum, stage: "thumbnail" });
  await thumbnailQueue.add(
    "thumbnail",
    { assetId },
    buildImageJobOptions(thumbnailJobId, priorityTier),
  );

  return { originalStorageKey, checksum, qualityTier };
};

export const createIngestWorker = (deps: CreateIngestWorkerDeps): Worker => {
  const { connection, concurrency, logger: configuredLogger } = deps;
  const logger = configuredLogger ?? noopPipelineLogger;
  return new Worker<ImageIngestJobData, ImageIngestJobResult>(
    IMAGE_QUEUE_NAMES.ingest,
    withStageLogging("ingest", logger, (job) => processIngestJob(job, deps)),
    buildWorkerOptions(connection, concurrency ?? pipelineConfig.workerConcurrency.ingest),
  );
};
