import { describe, expect, it } from "vitest";

import { CreatorStatus, UserRole } from "#generated/prisma/enums.js";

import {
  fromPriorityTier,
  fromQualityTier,
  resolvePriorityTier,
  toImageAssetRecord,
} from "./image-processing.utils.js";

describe("resolvePriorityTier", () => {
  it("ranks admins as bulkAdmin regardless of creator status", () => {
    expect(
      resolvePriorityTier({
        role: UserRole.ADMIN,
        isCreator: true,
        creatorStatus: CreatorStatus.APPROVED,
      }),
    ).toBe("bulkAdmin");
  });

  it("ranks an approved creator as paidCreator", () => {
    expect(
      resolvePriorityTier({
        role: UserRole.CUSTOMER,
        isCreator: true,
        creatorStatus: CreatorStatus.APPROVED,
      }),
    ).toBe("paidCreator");
  });

  it("ranks a pending (not-yet-approved) creator as standard", () => {
    expect(
      resolvePriorityTier({
        role: UserRole.CUSTOMER,
        isCreator: true,
        creatorStatus: CreatorStatus.PENDING,
      }),
    ).toBe("standard");
  });

  it("ranks a plain customer as standard", () => {
    expect(
      resolvePriorityTier({
        role: UserRole.CUSTOMER,
        isCreator: false,
        creatorStatus: CreatorStatus.NONE,
      }),
    ).toBe("standard");
  });
});

describe("fromPriorityTier / fromQualityTier", () => {
  it("round-trips every priority tier to its Prisma enum value", () => {
    expect(fromPriorityTier("paidCreator")).toBe("PAID_CREATOR");
    expect(fromPriorityTier("standard")).toBe("STANDARD");
    expect(fromPriorityTier("bulkAdmin")).toBe("BULK_ADMIN");
  });

  it("round-trips every quality tier to its Prisma enum value", () => {
    expect(fromQualityTier("hero")).toBe("HERO");
    expect(fromQualityTier("standard")).toBe("STANDARD");
  });
});

describe("toImageAssetRecord", () => {
  const baseRow = {
    id: "asset-1",
    ownerId: "owner-1",
    checksum: "checksum-1",
    priorityTier: "STANDARD" as const,
    qualityTier: "STANDARD" as const,
    status: "PENDING" as const,
    tempStorageKey: "temp/asset-1.jpg",
    tempFileCleanedUp: false,
    originalStorageKey: null,
    resizedVariants: null,
    encodedVariants: null,
    thumbnailStorageKey: null,
    lqip: null,
    optimizeCompletedAt: null,
    thumbnailCompletedAt: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("maps a pending Prisma row with null JSON fields", () => {
    const { status, resizedVariants, encodedVariants } = toImageAssetRecord(baseRow);
    expect(status).toBe("pending");
    expect(resizedVariants).toBeNull();
    expect(encodedVariants).toBeNull();
  });

  it("parses resizedVariants/encodedVariants JSON columns into typed arrays", () => {
    const { status, resizedVariants, encodedVariants } = toImageAssetRecord({
      ...baseRow,
      status: "COMPLETED",
      resizedVariants: [{ width: 640, storageKey: "resized/checksum-1/640w.bin" }],
      encodedVariants: [
        { width: 640, format: "jpeg", storageKey: "variants/checksum-1/640w.jpg", bytes: 1234 },
      ],
    });

    expect(status).toBe("completed");
    expect(resizedVariants).toEqual([{ width: 640, storageKey: "resized/checksum-1/640w.bin" }]);
    expect(encodedVariants).toEqual([
      { width: 640, format: "jpeg", storageKey: "variants/checksum-1/640w.jpg", bytes: 1234 },
    ]);
  });

  it("maps priority/quality tiers back from Prisma enum values", () => {
    const { priorityTier, qualityTier } = toImageAssetRecord({
      ...baseRow,
      priorityTier: "PAID_CREATOR",
      qualityTier: "HERO",
    });
    expect(priorityTier).toBe("paidCreator");
    expect(qualityTier).toBe("hero");
  });
});
