import type { ConnectionOptions } from "bullmq";
import { Worker } from "bullmq";

import { pipelineConfig } from "../config/pipeline.config.js";
import { encodeVariantsForWidth } from "../processing/image-optimize.js";
import { maybeCleanupTempFile } from "../queue/cleanup-temp-file.utils.js";
import { encodedVariantStorageKeyFor } from "../queue/content-addressed-key.utils.js";
import type { ImageAssetRepository } from "../queue/image-asset-repository.types.js";
import type {
  EncodedVariantDescriptor,
  ImageOptimizeJobData,
  ImageOptimizeJobResult,
} from "../queue/image-job.types.js";
import { IMAGE_QUEUE_NAMES } from "../queue/queue-names.constants.js";
import type { StorageAdapter } from "../storage/storage-adapter.types.js";
import type { PipelineLogger } from "./pipeline-logger.types.js";
import { noopPipelineLogger } from "./pipeline-logger.types.js";
import type { JobInput } from "./worker-shared.utils.js";
import { buildWorkerOptions, withStageLogging } from "./worker-shared.utils.js";

export type CreateOptimizeWorkerDeps = {
  connection: ConnectionOptions;
  outputStorageAdapter: StorageAdapter;
  tempStorageAdapter: StorageAdapter;
  assetRepository: ImageAssetRepository;
  logger?: PipelineLogger;
  concurrency?: number;
};

export const processOptimizeJob = async (
  job: JobInput<ImageOptimizeJobData>,
  deps: Omit<CreateOptimizeWorkerDeps, "connection" | "concurrency" | "logger">,
): Promise<ImageOptimizeJobResult> => {
  const { assetId } = job.data;
  const { outputStorageAdapter, tempStorageAdapter, assetRepository } = deps;

  const asset = await assetRepository.findById(assetId);
  const { resizedVariants, qualityTier, checksum } = asset;
  if (!resizedVariants) {
    throw new Error(`Asset ${assetId} has no resizedVariants — resize has not completed.`);
  }

  const encodedDescriptors: EncodedVariantDescriptor[] = [];
  for (const { storageKey: resizedStorageKey, width } of resizedVariants) {
    const resizedBuffer = await outputStorageAdapter.get(resizedStorageKey);
    const encodedVariants = await encodeVariantsForWidth(
      { width, buffer: resizedBuffer },
      qualityTier,
    );
    for (const { width: encodedWidth, format, buffer, bytes } of encodedVariants) {
      const storageKey = encodedVariantStorageKeyFor(checksum, encodedWidth, format);
      await outputStorageAdapter.put(storageKey, buffer);
      encodedDescriptors.push({ width: encodedWidth, format, storageKey, bytes });
    }
  }

  await assetRepository.markOptimizeCompleted(assetId, encodedDescriptors);
  await maybeCleanupTempFile(assetId, assetRepository, tempStorageAdapter);

  return { variants: encodedDescriptors };
};

export const createOptimizeWorker = (deps: CreateOptimizeWorkerDeps): Worker => {
  const { connection, concurrency, logger: configuredLogger } = deps;
  const logger = configuredLogger ?? noopPipelineLogger;
  return new Worker<ImageOptimizeJobData, ImageOptimizeJobResult>(
    IMAGE_QUEUE_NAMES.optimize,
    withStageLogging("optimize", logger, (job) => processOptimizeJob(job, deps)),
    buildWorkerOptions(connection, concurrency ?? pipelineConfig.workerConcurrency.optimize),
  );
};
