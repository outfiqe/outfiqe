import fs from "node:fs/promises";
import path from "node:path";

import type { ConnectionOptions, Queue } from "bullmq";
import { Worker } from "bullmq";

import { pipelineConfig } from "../config/pipeline.config.js";
import { IMAGE_QUEUE_NAMES } from "../queue/queue-names.constants.js";
import type { PipelineLogger } from "./pipeline-logger.types.js";
import { noopPipelineLogger } from "./pipeline-logger.types.js";
import type { JobInput } from "./worker-shared.utils.js";
import { buildWorkerOptions, withStageLogging } from "./worker-shared.utils.js";

export type CleanupJobData = Record<string, never>;
export type CleanupJobResult = { deletedCount: number };

const MS_PER_HOUR = 60 * 60 * 1000;

const listFilesRecursively = async (rootDir: string): Promise<string[]> => {
  const entries = await fs.readdir(rootDir, { withFileTypes: true }).catch((error) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  });

  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return listFilesRecursively(entryPath);
      }
      return [entryPath];
    }),
  );
  return files.flat();
};

export const purgeOrphanedTempFiles = async (
  tempUploadDir: string,
  maxAgeHours: number,
): Promise<CleanupJobResult> => {
  const maxAgeMs = maxAgeHours * MS_PER_HOUR;
  const now = Date.now();
  const filePaths = await listFilesRecursively(tempUploadDir);

  let deletedCount = 0;
  for (const filePath of filePaths) {
    const stats = await fs.stat(filePath);
    if (now - stats.mtimeMs > maxAgeMs) {
      await fs.unlink(filePath);
      deletedCount += 1;
    }
  }

  return { deletedCount };
};

export type CreateCleanupWorkerDeps = {
  connection: ConnectionOptions;
  tempUploadDir: string;
  logger?: PipelineLogger;
};

export const createCleanupWorker = (deps: CreateCleanupWorkerDeps): Worker => {
  const { connection, tempUploadDir, logger: configuredLogger } = deps;
  const logger = configuredLogger ?? noopPipelineLogger;
  const processor = async (_job: JobInput<CleanupJobData>) =>
    purgeOrphanedTempFiles(tempUploadDir, pipelineConfig.cleanup.tempFileMaxAgeHours);

  return new Worker<CleanupJobData, CleanupJobResult>(
    IMAGE_QUEUE_NAMES.cleanup,
    withStageLogging("cleanup", logger, processor),
    buildWorkerOptions(connection, pipelineConfig.workerConcurrency.cleanup),
  );
};

const CLEANUP_REPEATABLE_JOB_ID = "image-cleanup-sweep";

export const scheduleCleanupSweep = async (cleanupQueue: Queue): Promise<void> => {
  await cleanupQueue.upsertJobScheduler(
    CLEANUP_REPEATABLE_JOB_ID,
    { every: pipelineConfig.cleanup.sweepIntervalMs },
    { name: "cleanup-sweep", data: {} },
  );
};
