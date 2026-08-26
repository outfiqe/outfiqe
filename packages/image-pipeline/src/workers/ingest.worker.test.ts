import { describe, expect, it, vi } from "vitest";

import { InMemoryStorageAdapter } from "../storage/adapters/in-memory.adapter.js";
import { createTestImageBuffer } from "../testing/fixtures.js";
import {
  buildTestImageAssetRecord,
  InMemoryImageAssetRepository,
} from "../testing/in-memory-asset-repository.js";
import { processIngestJob } from "./ingest.worker.js";

describe("processIngestJob", () => {
  it("validates the temp file, persists the original, and enqueues a thumbnail job", async () => {
    const tempStorageAdapter = new InMemoryStorageAdapter();
    const outputStorageAdapter = new InMemoryStorageAdapter();
    const assetRepository = new InMemoryImageAssetRepository();
    const thumbnailQueue = { add: vi.fn() };

    const imageBuffer = await createTestImageBuffer(640, 480, "jpeg");
    await tempStorageAdapter.put("temp/asset-1.jpg", imageBuffer);
    assetRepository.seed(
      buildTestImageAssetRecord({ id: "asset-1", tempStorageKey: "temp/asset-1.jpg" }),
    );

    const { originalStorageKey } = await processIngestJob(
      {
        data: {
          assetId: "asset-1",
          ownerId: "owner-1",
          tempStorageKey: "temp/asset-1.jpg",
          checksum: "checksum-1",
          priorityTier: "standard",
          qualityTier: "standard",
        },
      },
      {
        tempStorageAdapter,
        outputStorageAdapter,
        assetRepository,
        thumbnailQueue,
      },
    );

    expect(originalStorageKey).toBe("originals/checksum-1.jpg");
    await expect(outputStorageAdapter.exists("originals/checksum-1.jpg")).resolves.toBe(true);

    const updatedAsset = await assetRepository.findById("asset-1");
    expect(updatedAsset.status).toBe("processing");
    expect(updatedAsset.originalStorageKey).toBe("originals/checksum-1.jpg");

    expect(thumbnailQueue.add).toHaveBeenCalledTimes(1);
    expect(thumbnailQueue.add).toHaveBeenCalledWith(
      "thumbnail",
      { assetId: "asset-1" },
      expect.objectContaining({ jobId: expect.stringContaining("thumbnail-") }),
    );
  });

  it("rejects a corrupt temp file without persisting anything", async () => {
    const tempStorageAdapter = new InMemoryStorageAdapter();
    const outputStorageAdapter = new InMemoryStorageAdapter();
    const assetRepository = new InMemoryImageAssetRepository();
    const thumbnailQueue = { add: vi.fn() };

    await tempStorageAdapter.put("temp/asset-2.bin", Buffer.from("not an image"));
    assetRepository.seed(
      buildTestImageAssetRecord({ id: "asset-2", tempStorageKey: "temp/asset-2.bin" }),
    );

    await expect(
      processIngestJob(
        {
          data: {
            assetId: "asset-2",
            ownerId: "owner-1",
            tempStorageKey: "temp/asset-2.bin",
            checksum: "checksum-2",
            priorityTier: "standard",
            qualityTier: "standard",
          },
        },
        {
          tempStorageAdapter,
          outputStorageAdapter,
          assetRepository,
          thumbnailQueue,
        },
      ),
    ).rejects.toThrow();

    expect(thumbnailQueue.add).not.toHaveBeenCalled();
  });
});
