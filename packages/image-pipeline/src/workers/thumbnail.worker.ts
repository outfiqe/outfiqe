import type { ConnectionOptions } from "bullmq";
import { Worker } from "bullmq";

import { pipelineConfig } from "../config/pipeline.config.js";
import { generateThumbnail } from "../processing/image-thumbnail.js";
import { maybeCleanupTempFile } from "../queue/cleanup-temp-file.utils.js";
import { thumbnailStorageKeyFor } from "../queue/content-addressed-key.utils.js";
import type { ImageAssetRepository } from "../queue/image-asset-repository.types.js";
import type { ImageThumbnailJobData, ImageThumbnailJobResult } from "../queue/image-job.types.js";
import { IMAGE_QUEUE_NAMES } from "../queue/queue-names.constants.js";
import type { StorageAdapter } from "../storage/storage-adapter.types.js";
import type { PipelineLogger } from "./pipeline-logger.types.js";
import { noopPipelineLogger } from "./pipeline-logger.types.js";
import type { JobInput } from "./worker-shared.utils.js";
import { buildWorkerOptions, withStageLogging } from "./worker-shared.utils.js";

export type CreateThumbnailWorkerDeps = {
  connection: ConnectionOptions;
  outputStorageAdapter: StorageAdapter;
  tempStorageAdapter: StorageAdapter;
  assetRepository: ImageAssetRepository;
  logger?: PipelineLogger;
  concurrency?: number;
};

export const processThumbnailJob = async (
  job: JobInput<ImageThumbnailJobData>,
  deps: Omit<CreateThumbnailWorkerDeps, "connection" | "concurrency" | "logger">,
): Promise<ImageThumbnailJobResult> => {
  const { assetId } = job.data;
  const { outputStorageAdapter, tempStorageAdapter, assetRepository } = deps;

  const asset = await assetRepository.findById(assetId);
  const { originalStorageKey, checksum } = asset;
  if (!originalStorageKey) {
    throw new Error(`Asset ${assetId} has no originalStorageKey — ingest has not completed.`);
  }

  const originalBuffer = await outputStorageAdapter.get(originalStorageKey);
  const { thumbnail, lqip } = await generateThumbnail(originalBuffer);

  const thumbnailStorageKey = thumbnailStorageKeyFor(checksum);
  await outputStorageAdapter.put(thumbnailStorageKey, thumbnail.buffer);
  await assetRepository.markThumbnailCompleted(assetId, { thumbnailStorageKey, lqip });
  await maybeCleanupTempFile(assetId, assetRepository, tempStorageAdapter);

  return { thumbnailStorageKey, lqip };
};

export const createThumbnailWorker = (deps: CreateThumbnailWorkerDeps): Worker => {
  const { connection, concurrency, logger: configuredLogger } = deps;
  const logger = configuredLogger ?? noopPipelineLogger;
  return new Worker<ImageThumbnailJobData, ImageThumbnailJobResult>(
    IMAGE_QUEUE_NAMES.thumbnail,
    withStageLogging("thumbnail", logger, (job) => processThumbnailJob(job, deps)),
    buildWorkerOptions(connection, concurrency ?? pipelineConfig.workerConcurrency.thumbnail),
  );
};
