import { describe, expect, it } from "vitest";

import { InMemoryStorageAdapter } from "../storage/adapters/in-memory.adapter.js";
import { createTestImageBuffer } from "../testing/fixtures.js";
import {
  buildTestImageAssetRecord,
  InMemoryImageAssetRepository,
} from "../testing/in-memory-asset-repository.js";
import { processThumbnailJob } from "./thumbnail.worker.js";

describe("processThumbnailJob", () => {
  it("generates a thumbnail and lqip from the original, and cleans up temp once fully complete", async () => {
    const outputStorageAdapter = new InMemoryStorageAdapter();
    const tempStorageAdapter = new InMemoryStorageAdapter();
    const assetRepository = new InMemoryImageAssetRepository();

    const originalBuffer = await createTestImageBuffer(1920, 1080, "jpeg");
    await outputStorageAdapter.put("originals/checksum-1.jpg", originalBuffer);
    await tempStorageAdapter.put("temp/asset-1.jpg", Buffer.from("original upload bytes"));
    assetRepository.seed(
      buildTestImageAssetRecord({
        id: "asset-1",
        checksum: "checksum-1",
        tempStorageKey: "temp/asset-1.jpg",
        originalStorageKey: "originals/checksum-1.jpg",
        optimizeCompletedAt: new Date(),
      }),
    );

    const { thumbnailStorageKey, lqip } = await processThumbnailJob(
      { data: { assetId: "asset-1" } },
      { outputStorageAdapter, tempStorageAdapter, assetRepository },
    );

    expect(thumbnailStorageKey).toBe("thumbnails/checksum-1.webp");
    expect(lqip.startsWith("data:image/jpeg;base64,")).toBe(true);
    await expect(outputStorageAdapter.exists(thumbnailStorageKey)).resolves.toBe(true);

    const updatedAsset = await assetRepository.findById("asset-1");
    expect(updatedAsset.thumbnailCompletedAt).not.toBeNull();
    expect(updatedAsset.status).toBe("completed");
    expect(updatedAsset.tempFileCleanedUp).toBe(true);
    await expect(tempStorageAdapter.exists("temp/asset-1.jpg")).resolves.toBe(false);
  });

  it("does not clean up the temp file when optimize has not finished yet", async () => {
    const outputStorageAdapter = new InMemoryStorageAdapter();
    const tempStorageAdapter = new InMemoryStorageAdapter();
    const assetRepository = new InMemoryImageAssetRepository();

    const originalBuffer = await createTestImageBuffer(640, 480, "jpeg");
    await outputStorageAdapter.put("originals/checksum-2.jpg", originalBuffer);
    await tempStorageAdapter.put("temp/asset-2.jpg", Buffer.from("original upload bytes"));
    assetRepository.seed(
      buildTestImageAssetRecord({
        id: "asset-2",
        checksum: "checksum-2",
        tempStorageKey: "temp/asset-2.jpg",
        originalStorageKey: "originals/checksum-2.jpg",
        optimizeCompletedAt: null,
      }),
    );

    await processThumbnailJob(
      { data: { assetId: "asset-2" } },
      { outputStorageAdapter, tempStorageAdapter, assetRepository },
    );

    const updatedAsset = await assetRepository.findById("asset-2");
    expect(updatedAsset.tempFileCleanedUp).toBe(false);
    await expect(tempStorageAdapter.exists("temp/asset-2.jpg")).resolves.toBe(true);
  });

  it("throws when ingest has not completed (no originalStorageKey yet)", async () => {
    const outputStorageAdapter = new InMemoryStorageAdapter();
    const tempStorageAdapter = new InMemoryStorageAdapter();
    const assetRepository = new InMemoryImageAssetRepository();
    assetRepository.seed(buildTestImageAssetRecord({ id: "asset-3", originalStorageKey: null }));

    await expect(
      processThumbnailJob(
        { data: { assetId: "asset-3" } },
        { outputStorageAdapter, tempStorageAdapter, assetRepository },
      ),
    ).rejects.toThrow(/ingest has not completed/);
  });
});
