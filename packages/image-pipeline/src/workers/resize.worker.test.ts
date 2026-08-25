import { describe, expect, it } from "vitest";

import { InMemoryStorageAdapter } from "../storage/adapters/in-memory.adapter.js";
import { createTestImageBuffer } from "../testing/fixtures.js";
import {
  buildTestImageAssetRecord,
  InMemoryImageAssetRepository,
} from "../testing/in-memory-asset-repository.js";
import { processResizeJob } from "./resize.worker.js";

describe("processResizeJob", () => {
  it("resizes the original into breakpoint variants and records them on the asset", async () => {
    const outputStorageAdapter = new InMemoryStorageAdapter();
    const assetRepository = new InMemoryImageAssetRepository();

    const originalBuffer = await createTestImageBuffer(1080, 720, "jpeg");
    await outputStorageAdapter.put("originals/checksum-1.jpg", originalBuffer);
    assetRepository.seed(
      buildTestImageAssetRecord({
        id: "asset-1",
        checksum: "checksum-1",
        originalStorageKey: "originals/checksum-1.jpg",
      }),
    );

    const { variants } = await processResizeJob(
      { data: { assetId: "asset-1" } },
      { outputStorageAdapter, assetRepository },
    );

    expect(variants.map((variant) => variant.width)).toEqual([320, 640, 1080]);
    for (const variant of variants) {
      await expect(outputStorageAdapter.exists(variant.storageKey)).resolves.toBe(true);
    }

    const updatedAsset = await assetRepository.findById("asset-1");
    expect(updatedAsset.resizedVariants).toEqual(variants);
  });

  it("rejects (rather than crashing) when the storage adapter fails mid-pipeline", async () => {
    const assetRepository = new InMemoryImageAssetRepository();
    assetRepository.seed(
      buildTestImageAssetRecord({ id: "asset-3", originalStorageKey: "originals/checksum-3.jpg" }),
    );
    const failingStorageAdapter = {
      put: async () => undefined,
      get: async () => {
        throw new Error("simulated storage backend outage");
      },
      delete: async () => undefined,
      exists: async () => true,
      getSignedUrl: async () => "https://example.com/signed",
    };

    await expect(
      processResizeJob(
        { data: { assetId: "asset-3" } },
        { outputStorageAdapter: failingStorageAdapter, assetRepository },
      ),
    ).rejects.toThrow(/simulated storage backend outage/);
  });

  it("throws when ingest has not completed (no originalStorageKey yet)", async () => {
    const outputStorageAdapter = new InMemoryStorageAdapter();
    const assetRepository = new InMemoryImageAssetRepository();
    assetRepository.seed(buildTestImageAssetRecord({ id: "asset-2", originalStorageKey: null }));

    await expect(
      processResizeJob({ data: { assetId: "asset-2" } }, { outputStorageAdapter, assetRepository }),
    ).rejects.toThrow(/ingest has not completed/);
  });
});
