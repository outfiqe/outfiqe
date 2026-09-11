import { renderHook } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type PendingPhoto, resolvePendingPhotoAssets, usePendingPhotos } from "./usePendingPhotos";

const uploadWithPipeline = vi.fn();
const getCroppedImageFile = vi.fn();

vi.mock("@/shared/api/uploadsApi", () => ({
  uploadsApi: {
    uploadWithPipeline: (...args: unknown[]) => uploadWithPipeline(...args),
  },
}));

vi.mock("@outfiqe/design-system", () => ({
  getCroppedImageFile: (...args: unknown[]) => getCroppedImageFile(...args),
}));

const DEFAULT_MIME = "image/jpeg";

const existingPhoto = (url: string): PendingPhoto => ({
  id: url,
  url,
  file: null,
  crop: { x: 0, y: 0 },
  zoom: 1,
  croppedAreaPixels: null,
});

const newPhoto = (
  id: string,
  croppedAreaPixels: PendingPhoto["croppedAreaPixels"] = null,
): PendingPhoto => ({
  id,
  url: `blob:${id}`,
  file: new File([id], `${id}.jpg`, { type: "image/jpeg" }),
  crop: { x: 0, y: 0 },
  zoom: 1,
  croppedAreaPixels,
});

beforeEach(() => {
  uploadWithPipeline.mockReset();
  getCroppedImageFile.mockReset();
});

describe("resolvePendingPhotoAssets", () => {
  it("returns the existing urls with null asset ids and never uploads when nothing is new", async () => {
    const result = await resolvePendingPhotoAssets(
      [existingPhoto("https://cdn/one.jpg"), existingPhoto("https://cdn/two.jpg")],
      DEFAULT_MIME,
    );

    expect(result).toEqual({
      urls: ["https://cdn/one.jpg", "https://cdn/two.jpg"],
      imageAssetIds: [null, null],
    });
    expect(uploadWithPipeline).not.toHaveBeenCalled();
  });

  it("uploads only the new photos and keeps every slot aligned by position", async () => {
    getCroppedImageFile.mockResolvedValue(new File(["cropped"], "fresh.jpg"));
    uploadWithPipeline.mockResolvedValue([{ url: "https://cdn/uploaded.jpg", assetId: "asset-1" }]);

    const result = await resolvePendingPhotoAssets(
      [
        existingPhoto("https://cdn/kept.jpg"),
        newPhoto("fresh", { x: 0, y: 0, width: 10, height: 10 }),
      ],
      DEFAULT_MIME,
    );

    expect(uploadWithPipeline).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      urls: ["https://cdn/kept.jpg", "https://cdn/uploaded.jpg"],
      imageAssetIds: [null, "asset-1"],
    });
  });

  it("throws instead of silently uploading the uncropped original when a new photo has no cropped area yet", async () => {
    await expect(resolvePendingPhotoAssets([newPhoto("uncropped")], DEFAULT_MIME)).rejects.toThrow(
      /isn't cropped yet/,
    );
    expect(uploadWithPipeline).not.toHaveBeenCalled();
  });

  it("crops a new photo through getCroppedImageFile before uploading it", async () => {
    getCroppedImageFile.mockResolvedValue(new File(["cropped"], "cropped.jpg"));
    uploadWithPipeline.mockResolvedValue([{ url: "https://cdn/c.jpg", assetId: "asset-2" }]);

    await resolvePendingPhotoAssets(
      [newPhoto("cropme", { x: 0, y: 0, width: 10, height: 10 })],
      DEFAULT_MIME,
    );

    expect(getCroppedImageFile).toHaveBeenCalledOnce();
  });

  it("throws when the upload returns fewer results than the new photos", async () => {
    getCroppedImageFile.mockResolvedValue(new File(["cropped"], "cropped.jpg"));
    uploadWithPipeline.mockResolvedValue([]);

    const croppedArea = { x: 0, y: 0, width: 10, height: 10 };
    await expect(
      resolvePendingPhotoAssets(
        [newPhoto("a", croppedArea), newPhoto("b", croppedArea)],
        DEFAULT_MIME,
      ),
    ).rejects.toThrow(/fewer results/);
  });
});

describe("usePendingPhotos hasUnresolvedCrop", () => {
  const jpegFile = () => new File(["photo-bytes"], "photo.jpg", { type: "image/jpeg" });

  beforeEach(() => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("is false with no photos and becomes true for a newly added photo before any crop completes", async () => {
    const { result } = renderHook(() => usePendingPhotos(6));
    expect(result.current.hasUnresolvedCrop).toBe(false);

    await act(async () => {
      await result.current.importFile(jpegFile());
    });

    expect(result.current.hasUnresolvedCrop).toBe(true);
  });

  it("clears once the active photo's crop completes", async () => {
    const { result } = renderHook(() => usePendingPhotos(6));

    await act(async () => {
      await result.current.importFile(jpegFile());
    });
    expect(result.current.hasUnresolvedCrop).toBe(true);

    act(() => {
      result.current.updateActivePhoto({
        croppedAreaPixels: { x: 0, y: 0, width: 10, height: 10 },
      });
    });

    expect(result.current.hasUnresolvedCrop).toBe(false);
  });
});
