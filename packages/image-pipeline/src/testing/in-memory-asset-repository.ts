import type {
  ImageAssetRecord,
  ImageAssetRepository,
} from "../queue/image-asset-repository.types.js";
import type {
  EncodedVariantDescriptor,
  ResizedVariantDescriptor,
} from "../queue/image-job.types.js";

export class InMemoryImageAssetRepository implements ImageAssetRepository {
  private readonly records = new Map<string, ImageAssetRecord>();

  seed(record: ImageAssetRecord): void {
    this.records.set(record.id, record);
  }

  private require(assetId: string): ImageAssetRecord {
    const record = this.records.get(assetId);
    if (!record) {
      throw new Error(`No seeded ImageAssetRecord for assetId: ${assetId}`);
    }
    return record;
  }

  async findById(assetId: string): Promise<ImageAssetRecord> {
    return { ...this.require(assetId) };
  }

  async markProcessing(assetId: string): Promise<void> {
    const record = this.require(assetId);
    record.status = "processing";
  }

  async markIngestCompleted(assetId: string, originalStorageKey: string): Promise<void> {
    const record = this.require(assetId);
    record.originalStorageKey = originalStorageKey;
  }

  async markResizeCompleted(assetId: string, variants: ResizedVariantDescriptor[]): Promise<void> {
    const record = this.require(assetId);
    record.resizedVariants = variants;
  }

  async markOptimizeCompleted(
    assetId: string,
    variants: EncodedVariantDescriptor[],
  ): Promise<void> {
    const record = this.require(assetId);
    record.encodedVariants = variants;
    record.optimizeCompletedAt = new Date();
    if (record.optimizeCompletedAt && record.thumbnailCompletedAt) {
      record.status = "completed";
    }
  }

  async markThumbnailCompleted(
    assetId: string,
    result: { thumbnailStorageKey: string; lqip: string },
  ): Promise<void> {
    const record = this.require(assetId);
    record.thumbnailStorageKey = result.thumbnailStorageKey;
    record.lqip = result.lqip;
    record.thumbnailCompletedAt = new Date();
    if (record.optimizeCompletedAt && record.thumbnailCompletedAt) {
      record.status = "completed";
    }
  }

  async markTempFileCleanedUp(assetId: string): Promise<void> {
    const record = this.require(assetId);
    record.tempFileCleanedUp = true;
  }

  async markFailed(assetId: string, errorMessage: string): Promise<void> {
    const record = this.require(assetId);
    record.status = "failed";
    record.errorMessage = errorMessage;
  }
}

export const buildTestImageAssetRecord = (
  overrides: Partial<ImageAssetRecord> = {},
): ImageAssetRecord => ({
  id: "test-asset-id",
  ownerId: "test-owner-id",
  checksum: "test-checksum",
  priorityTier: "standard",
  qualityTier: "standard",
  status: "pending",
  tempStorageKey: "temp/test-asset-id.jpg",
  tempFileCleanedUp: false,
  originalStorageKey: null,
  resizedVariants: null,
  encodedVariants: null,
  thumbnailStorageKey: null,
  lqip: null,
  optimizeCompletedAt: null,
  thumbnailCompletedAt: null,
  errorMessage: null,
  ...overrides,
});
