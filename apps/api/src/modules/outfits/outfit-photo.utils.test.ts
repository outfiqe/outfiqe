import { describe, expect, it } from "vitest";

import {
  ImageProcessingStatus,
  OutfitPhotoKind,
  OutfitPhotoStatus,
} from "#generated/prisma/enums.js";

import type { OutfitPhotoRow } from "./outfit-photo.repository.js";
import { groupCoversByOutfit, toOutfitPhotoView } from "./outfit-photo.utils.js";

const photoRow = (overrides: Partial<OutfitPhotoRow> = {}): OutfitPhotoRow => ({
  id: "photo-1",
  kind: OutfitPhotoKind.COVER,
  status: OutfitPhotoStatus.PROCESSING,
  imageUrl: "https://cdn.outfiqe.test/photo-1.jpg",
  coverPosition: null,
  createdAt: new Date("2026-10-04T10:00:00.000Z"),
  uploader: { id: "user-1", name: "Sita", handle: "sita", avatarUrl: null },
  imageAsset: { status: ImageProcessingStatus.PENDING, encodedVariants: null, lqip: null },
  ...overrides,
});

describe("toOutfitPhotoView", () => {
  it("falls back to the uploaded image while the photo is still processing", () => {
    expect(toOutfitPhotoView(photoRow())).toEqual({
      id: "photo-1",
      kind: OutfitPhotoKind.COVER,
      status: OutfitPhotoStatus.PROCESSING,
      image: { url: "https://cdn.outfiqe.test/photo-1.jpg", lqip: null, sources: [] },
      uploadedBy: { id: "user-1", name: "Sita", handle: "sita", avatarUrl: null },
      coverPosition: null,
      createdAt: "2026-10-04T10:00:00.000Z",
    });
  });

  it("keeps a photo whose uploader has left the platform, with no name attached", () => {
    expect(toOutfitPhotoView(photoRow({ uploader: null })).uploadedBy).toBeNull();
  });
});

describe("groupCoversByOutfit", () => {
  it("groups cover photos by build, keeping their order", () => {
    const coversByOutfitId = groupCoversByOutfit([
      { ...photoRow({ id: "cover-a", coverPosition: 0 }), outfitId: "outfit-1" },
      { ...photoRow({ id: "cover-b", coverPosition: 1 }), outfitId: "outfit-1" },
      { ...photoRow({ id: "cover-c", coverPosition: 0 }), outfitId: "outfit-2" },
    ]);

    expect(coversByOutfitId.get("outfit-1")?.map(({ id }) => id)).toEqual(["cover-a", "cover-b"]);
    expect(coversByOutfitId.get("outfit-2")?.map(({ id }) => id)).toEqual(["cover-c"]);
    expect(coversByOutfitId.get("outfit-3")).toBeUndefined();
  });
});
