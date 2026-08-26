import { describe, expect, it } from "vitest";

import { InMemoryStorageAdapter } from "../storage/adapters/in-memory.adapter.js";
import { createTestImageBuffer } from "../testing/fixtures.js";
import {
  buildTestImageAssetRecord,
  InMemoryImageAssetRepository,
} from "../testing/in-memory-asset-repository.js";
import { processOptimizeJob } from "./optimize.worker.js";

describe("processOptimizeJob", () => {
  it("encodes avif/webp/jpeg for every resized variant", async () => {
    const outputStorageAdapter = new InMemoryStorageAdapter();
    const tempStorageAdapter = new InMemoryStorageAdapter();
    const assetRepository = new InMemoryImageAssetRepository();

    const resizedBuffer = await createTestImageBuffer(640, 480, "jpeg");
    await outputStorageAdapter.put("resized/checksum-1/640w.bin", resizedBuffer);
    assetRepository.seed(
      buildTestImageAssetRecord({
        id: "asset-1",
        checksum: "checksum-1",
        resizedVariants: [{ width: 640, storageKey: "resized/checksum-1/640w.bin" }],
        thumbnailCompletedAt: new Date(),
      }),
    );

    const { variants } = await processOptimizeJob(
      { data: { assetId: "asset-1" } },
      { outputStorageAdapter, tempStorageAdapter, assetRepository },
    );

    expect(variants).toHaveLength(3);
    expect(variants.map((variant) => variant.format).sort()).toEqual(["avif", "jpeg", "webp"]);

    const updatedAsset = await assetRepository.findById("asset-1");
    expect(updatedAsset.optimizeCompletedAt).not.toBeNull();
    expect(updatedAsset.status).toBe("completed");
  });

  it("throws when resize has not completed (no resizedVariants yet)", async () => {
    const outputStorageAdapter = new InMemoryStorageAdapter();
    const tempStorageAdapter = new InMemoryStorageAdapter();
    const assetRepository = new InMemoryImageAssetRepository();
    assetRepository.seed(buildTestImageAssetRecord({ id: "asset-2", resizedVariants: null }));

    await expect(
      processOptimizeJob(
        { data: { assetId: "asset-2" } },
        { outputStorageAdapter, tempStorageAdapter, assetRepository },
      ),
    ).rejects.toThrow(/resize has not completed/);
  });
});
