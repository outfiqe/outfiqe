import type { ConnectionOptions } from "bullmq";
import { Worker } from "bullmq";

import { pipelineConfig } from "../config/pipeline.config.js";
import { BREAKPOINT_WIDTHS_PX } from "../processing/image-processing.constants.js";
import { generateResizedVariants } from "../processing/image-resize.js";
import { resizedStorageKeyFor } from "../queue/content-addressed-key.utils.js";
import type { ImageAssetRepository } from "../queue/image-asset-repository.types.js";
import type {
  ImageResizeJobData,
  ImageResizeJobResult,
  ResizedVariantDescriptor,
} from "../queue/image-job.types.js";
import { IMAGE_QUEUE_NAMES } from "../queue/queue-names.constants.js";
import type { StorageAdapter } from "../storage/storage-adapter.types.js";
import type { PipelineLogger } from "./pipeline-logger.types.js";
import { noopPipelineLogger } from "./pipeline-logger.types.js";
import type { JobInput } from "./worker-shared.utils.js";
import { buildWorkerOptions, withStageLogging } from "./worker-shared.utils.js";

export type CreateResizeWorkerDeps = {
  connection: ConnectionOptions;
  outputStorageAdapter: StorageAdapter;
  assetRepository: ImageAssetRepository;
  logger?: PipelineLogger;
  concurrency?: number;
};

export const processResizeJob = async (
  job: JobInput<ImageResizeJobData>,
  deps: Omit<CreateResizeWorkerDeps, "connection" | "concurrency" | "logger">,
): Promise<ImageResizeJobResult> => {
  const { assetId } = job.data;
  const { outputStorageAdapter, assetRepository } = deps;

  const asset = await assetRepository.findById(assetId);
  const { originalStorageKey, checksum, qualityTier } = asset;
  if (!originalStorageKey) {
    throw new Error(`Asset ${assetId} has no originalStorageKey — ingest has not completed.`);
  }

  const originalBuffer = await outputStorageAdapter.get(originalStorageKey);
  const resizedVariants = await generateResizedVariants(originalBuffer, BREAKPOINT_WIDTHS_PX);

  const descriptors: ResizedVariantDescriptor[] = await Promise.all(
    resizedVariants.map(async ({ width, buffer }) => {
      const storageKey = resizedStorageKeyFor(checksum, width);
      await outputStorageAdapter.put(storageKey, buffer);
      return { width, storageKey };
    }),
  );

  await assetRepository.markResizeCompleted(assetId, descriptors);

  return { variants: descriptors, qualityTier };
};

export const createResizeWorker = (deps: CreateResizeWorkerDeps): Worker => {
  const { connection, concurrency, logger: configuredLogger } = deps;
  const logger = configuredLogger ?? noopPipelineLogger;
  return new Worker<ImageResizeJobData, ImageResizeJobResult>(
    IMAGE_QUEUE_NAMES.resize,
    withStageLogging("resize", logger, (job) => processResizeJob(job, deps)),
    buildWorkerOptions(connection, concurrency ?? pipelineConfig.workerConcurrency.resize),
  );
};
