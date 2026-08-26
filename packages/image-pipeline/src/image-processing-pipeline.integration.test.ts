import type { ConnectionOptions, QueueEvents, Worker } from "bullmq";
import { Redis } from "ioredis";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { computeChecksum } from "./queue/checksum.utils.js";
import { attachDeadLetterOnExhaustion } from "./queue/dead-letter.js";
import { enqueueImageProcessing } from "./queue/enqueue-image-processing.js";
import type { ImageProcessingQueues } from "./queue/queues.js";
import { closeImageProcessingQueues, createImageProcessingQueues } from "./queue/queues.js";
import { InMemoryStorageAdapter } from "./storage/adapters/in-memory.adapter.js";
import type { StorageAdapter } from "./storage/storage-adapter.types.js";
import { createTestImageBuffer } from "./testing/fixtures.js";
import {
  buildTestImageAssetRecord,
  InMemoryImageAssetRepository,
} from "./testing/in-memory-asset-repository.js";
import { createIngestWorker } from "./workers/ingest.worker.js";
import { createOptimizeWorker } from "./workers/optimize.worker.js";
import { createResizeWorker } from "./workers/resize.worker.js";
import { createThumbnailWorker } from "./workers/thumbnail.worker.js";

const testRedisUrl = new URL(
  process.env.IMAGE_PIPELINE_TEST_REDIS_URL ?? "redis://localhost:6379/15",
);
const connection: ConnectionOptions = {
  host: testRedisUrl.hostname,
  port: Number(testRedisUrl.port || 6379),
  db: Number(testRedisUrl.pathname.replace("/", "") || 0),
  maxRetriesPerRequest: null,
};

const POLL_INTERVAL_MS = 100;

const waitForAssetStatus = async (
  assetRepository: InMemoryImageAssetRepository,
  assetId: string,
  status: string,
  timeoutMs: number,
) => {
  const startedAtMs = Date.now();
  for (;;) {
    const asset = await assetRepository.findById(assetId);
    if (asset.status === status) {
      return asset;
    }
    if (Date.now() - startedAtMs > timeoutMs) {
      throw new Error(
        `Timed out waiting for asset ${assetId} to reach status "${status}" (last: ${asset.status})`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
};

describe("image processing pipeline (integration)", () => {
  let flushClient: Redis;
  let queues: ImageProcessingQueues;
  let resizeDeadLetterEvents: QueueEvents;
  const workers: Worker[] = [];

  beforeAll(async () => {
    flushClient = new Redis({
      host: testRedisUrl.hostname,
      port: Number(testRedisUrl.port || 6379),
      db: Number(testRedisUrl.pathname.replace("/", "") || 0),
    });
    await flushClient.flushdb();

    queues = createImageProcessingQueues(connection);
    resizeDeadLetterEvents = attachDeadLetterOnExhaustion(
      connection,
      queues.resize,
      queues.deadLetter,
      "resize",
    );
    await resizeDeadLetterEvents.waitUntilReady();
  });

  afterEach(async () => {
    await Promise.all(workers.map((worker) => worker.close()));
    workers.length = 0;
  });

  afterAll(async () => {
    await resizeDeadLetterEvents.close();
    await closeImageProcessingQueues(queues);
    await flushClient.quit();
  });

  it("runs ingest -> resize -> optimize -> thumbnail end-to-end and produces expected outputs", async () => {
    const tempStorageAdapter = new InMemoryStorageAdapter();
    const outputStorageAdapter = new InMemoryStorageAdapter();
    const assetRepository = new InMemoryImageAssetRepository();

    const originalBuffer = await createTestImageBuffer(1920, 1080, "jpeg");
    const checksum = computeChecksum(originalBuffer);
    const assetId = `integration-${checksum.slice(0, 12)}`;
    const tempStorageKey = `temp/${assetId}.jpg`;
    await tempStorageAdapter.put(tempStorageKey, originalBuffer);

    assetRepository.seed(
      buildTestImageAssetRecord({
        id: assetId,
        checksum,
        tempStorageKey,
        priorityTier: "standard",
        qualityTier: "standard",
      }),
    );

    workers.push(
      createIngestWorker({
        connection,
        tempStorageAdapter,
        outputStorageAdapter,
        assetRepository,
        thumbnailQueue: queues.thumbnail,
        concurrency: 2,
      }),
      createResizeWorker({ connection, outputStorageAdapter, assetRepository, concurrency: 2 }),
      createOptimizeWorker({
        connection,
        outputStorageAdapter,
        tempStorageAdapter,
        assetRepository,
        concurrency: 2,
      }),
      createThumbnailWorker({
        connection,
        outputStorageAdapter,
        tempStorageAdapter,
        assetRepository,
        concurrency: 2,
      }),
    );
    await Promise.all(workers.map((worker) => worker.waitUntilReady()));

    await enqueueImageProcessing(connection, {
      assetId,
      ownerId: "owner-1",
      checksum,
      tempStorageKey,
      priorityTier: "standard",
      qualityTier: "standard",
    });

    const {
      originalStorageKey,
      resizedVariants,
      encodedVariants,
      thumbnailStorageKey,
      lqip,
      tempFileCleanedUp,
    } = await waitForAssetStatus(assetRepository, assetId, "completed", 15000);

    expect(originalStorageKey).toBe(`originals/${checksum}.jpg`);
    expect(resizedVariants?.map((variant) => variant.width)).toEqual([320, 640, 1080, 1920]);
    expect(encodedVariants).toHaveLength(4 * 3);
    expect(thumbnailStorageKey).toBe(`thumbnails/${checksum}.webp`);
    expect(lqip?.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(tempFileCleanedUp).toBe(true);
    await expect(tempStorageAdapter.exists(tempStorageKey)).resolves.toBe(false);

    const smallestJpegVariant = encodedVariants?.find(
      (variant) => variant.format === "jpeg" && variant.width === 320,
    );
    expect(smallestJpegVariant).toBeDefined();
    expect(smallestJpegVariant?.bytes ?? Infinity).toBeLessThan(originalBuffer.byteLength);
  }, 20000);

  it("moves a job to the dead-letter queue instead of crashing the worker once retries are exhausted", async () => {
    const assetRepository = new InMemoryImageAssetRepository();
    const assetId = "integration-dead-letter-asset";
    assetRepository.seed(
      buildTestImageAssetRecord({
        id: assetId,
        checksum: "dead-letter-checksum",
        originalStorageKey: "originals/dead-letter-checksum.jpg",
      }),
    );

    const alwaysFailingStorageAdapter: StorageAdapter = {
      put: async () => undefined,
      get: async () => {
        throw new Error("simulated persistent storage backend outage");
      },
      delete: async () => undefined,
      exists: async () => true,
      getSignedUrl: async () => "https://example.com/signed",
    };

    const resizeWorker = createResizeWorker({
      connection,
      outputStorageAdapter: alwaysFailingStorageAdapter,
      assetRepository,
      concurrency: 2,
    });
    workers.push(resizeWorker);
    await resizeWorker.waitUntilReady();

    await queues.resize.add(
      "resize",
      { assetId },
      { jobId: `dead-letter-test-${assetId}`, attempts: 2, backoff: { type: "fixed", delay: 10 } },
    );

    const expectedOriginalJobId = `dead-letter-test-${assetId}`;
    const startedAtMs = Date.now();
    const timeoutMs = 10000;
    let deadLetterJob;
    do {
      if (Date.now() - startedAtMs > timeoutMs) {
        throw new Error("Timed out waiting for the job to land in the dead-letter queue");
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const deadLetterJobs = await queues.deadLetter.getJobs(["completed", "waiting", "active"]);
      deadLetterJob = deadLetterJobs.find(
        (job) => job.data.originalJobId === expectedOriginalJobId,
      );
    } while (!deadLetterJob);

    const { stage, failedReason } = deadLetterJob.data;
    expect(stage).toBe("resize");
    expect(failedReason).toMatch(/simulated persistent storage backend outage/);

    expect(resizeWorker.isRunning()).toBe(true);
  }, 15000);
});
