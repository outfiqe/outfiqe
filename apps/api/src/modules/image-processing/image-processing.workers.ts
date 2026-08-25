import type { PipelineLogger } from "@outfiqe/image-pipeline";
import {
  attachDeadLetterOnExhaustion,
  CircuitBreaker,
  createCleanupWorker,
  createIngestWorker,
  createOptimizeWorker,
  createResizeWorker,
  createThumbnailWorker,
  scheduleCleanupSweep,
} from "@outfiqe/image-pipeline";
import type { Queue, QueueEvents, Worker } from "bullmq";

import logger from "#lib/winston.utils.js";

import { imageProcessingQueues, imageQueueRedisConnection } from "./image-processing.queue.js";
import { prismaImageAssetRepository } from "./image-processing.repository.js";
import {
  imageOutputStorageAdapter,
  imageTempStorageAdapter,
  resolvedTempUploadDir,
} from "./image-processing.storage.js";

const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 10;
const CIRCUIT_BREAKER_COOLDOWN_MS = 60_000;

const pipelineLogger: PipelineLogger = logger;

let workers: Worker[] = [];
let deadLetterListeners: QueueEvents[] = [];

const attachCircuitBreaker = (worker: Worker, queue: Queue) => {
  const circuitBreaker = new CircuitBreaker(
    {
      failureThreshold: CIRCUIT_BREAKER_FAILURE_THRESHOLD,
      cooldownMs: CIRCUIT_BREAKER_COOLDOWN_MS,
    },
    {
      pauseQueue: () => queue.pause(),
      resumeQueue: () => queue.resume(),
      logger: pipelineLogger,
    },
  );
  worker.on("completed", () => circuitBreaker.recordSuccess());
  worker.on("failed", () => {
    void circuitBreaker.recordFailure();
  });
};

export const startImageProcessingWorkers = async (): Promise<void> => {
  const { ingest, resize, optimize, thumbnail, cleanup, deadLetter } = imageProcessingQueues;

  const ingestWorker = createIngestWorker({
    connection: imageQueueRedisConnection,
    tempStorageAdapter: imageTempStorageAdapter,
    outputStorageAdapter: imageOutputStorageAdapter,
    assetRepository: prismaImageAssetRepository,
    thumbnailQueue: thumbnail,
    logger: pipelineLogger,
  });
  const resizeWorker = createResizeWorker({
    connection: imageQueueRedisConnection,
    outputStorageAdapter: imageOutputStorageAdapter,
    assetRepository: prismaImageAssetRepository,
    logger: pipelineLogger,
  });
  const optimizeWorker = createOptimizeWorker({
    connection: imageQueueRedisConnection,
    outputStorageAdapter: imageOutputStorageAdapter,
    tempStorageAdapter: imageTempStorageAdapter,
    assetRepository: prismaImageAssetRepository,
    logger: pipelineLogger,
  });
  const thumbnailWorker = createThumbnailWorker({
    connection: imageQueueRedisConnection,
    outputStorageAdapter: imageOutputStorageAdapter,
    tempStorageAdapter: imageTempStorageAdapter,
    assetRepository: prismaImageAssetRepository,
    logger: pipelineLogger,
  });
  const cleanupWorker = createCleanupWorker({
    connection: imageQueueRedisConnection,
    tempUploadDir: resolvedTempUploadDir,
    logger: pipelineLogger,
  });

  workers = [ingestWorker, resizeWorker, optimizeWorker, thumbnailWorker, cleanupWorker];

  attachCircuitBreaker(resizeWorker, resize);
  attachCircuitBreaker(optimizeWorker, optimize);
  attachCircuitBreaker(thumbnailWorker, thumbnail);

  deadLetterListeners = [
    attachDeadLetterOnExhaustion(
      imageQueueRedisConnection,
      ingest,
      deadLetter,
      "ingest",
      pipelineLogger,
    ),
    attachDeadLetterOnExhaustion(
      imageQueueRedisConnection,
      resize,
      deadLetter,
      "resize",
      pipelineLogger,
    ),
    attachDeadLetterOnExhaustion(
      imageQueueRedisConnection,
      optimize,
      deadLetter,
      "optimize",
      pipelineLogger,
    ),
    attachDeadLetterOnExhaustion(
      imageQueueRedisConnection,
      thumbnail,
      deadLetter,
      "thumbnail",
      pipelineLogger,
    ),
  ];

  await scheduleCleanupSweep(cleanup);
};

export const stopImageProcessingWorkers = async (): Promise<void> => {
  await Promise.all(workers.map((worker) => worker.close()));
  await Promise.all(deadLetterListeners.map((listener) => listener.close()));
  workers = [];
  deadLetterListeners = [];
};
