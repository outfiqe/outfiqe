import { describe, expect, it, vi } from "vitest";

import { ImageProcessingStatus } from "#generated/prisma/enums.js";

vi.mock("#config/env.config.js", () => ({
  env: { API_PUBLIC_URL: "http://api.outfiqe.test" },
}));

import {
  type ImageAssetForResponsiveImage,
  imageAssetPublicBaseUrl,
  toResponsiveImage,
} from "./responsive-image.utils.js";

const FALLBACK_URL = "https://cdn.example.com/original.jpg";

const completedAsset = (
  overrides: Partial<ImageAssetForResponsiveImage> = {},
): ImageAssetForResponsiveImage => ({
  status: ImageProcessingStatus.COMPLETED,
  lqip: "data:image/webp;base64,blur",
  encodedVariants: [
    { width: 640, format: "avif", storageKey: "variants/abc/640w.avif", bytes: 20 },
    { width: 320, format: "avif", storageKey: "variants/abc/320w.avif", bytes: 10 },
    { width: 320, format: "webp", storageKey: "variants/abc/320w.webp", bytes: 12 },
    { width: 320, format: "jpeg", storageKey: "variants/abc/320w.jpg", bytes: 15 },
  ],
  ...overrides,
});

describe("imageAssetPublicBaseUrl", () => {
  it("joins the api public url with the asset path segment", () => {
    expect(imageAssetPublicBaseUrl()).toBe("http://api.outfiqe.test/image-processing-assets");
  });
});

describe("toResponsiveImage", () => {
  it("returns a fallback-only image when there is no asset", () => {
    expect(toResponsiveImage(FALLBACK_URL, null)).toEqual({
      url: FALLBACK_URL,
      lqip: null,
      sources: [],
    });
  });

  it("keeps the fallback url but surfaces the lqip while the asset is still processing", () => {
    const image = toResponsiveImage(
      FALLBACK_URL,
      completedAsset({ status: ImageProcessingStatus.PROCESSING }),
    );
    expect(image).toEqual({ url: FALLBACK_URL, lqip: "data:image/webp;base64,blur", sources: [] });
  });

  it("degrades to fallback-only when a completed asset has unparseable variants", () => {
    const image = toResponsiveImage(
      FALLBACK_URL,
      completedAsset({ encodedVariants: [{ width: "wide" }] }),
    );
    expect(image.sources).toEqual([]);
    expect(image.url).toBe(FALLBACK_URL);
  });

  it("builds one source per format, ordered avif then webp then jpeg", () => {
    const image = toResponsiveImage(FALLBACK_URL, completedAsset());
    expect(image.sources.map((source) => source.format)).toEqual(["avif", "webp", "jpeg"]);
  });

  it("orders each srcSet by ascending width and points at the public asset base url", () => {
    const avifSource = toResponsiveImage(FALLBACK_URL, completedAsset()).sources.find(
      (source) => source.format === "avif",
    );
    expect(avifSource?.srcSet).toBe(
      "http://api.outfiqe.test/image-processing-assets/variants/abc/320w.avif 320w, " +
        "http://api.outfiqe.test/image-processing-assets/variants/abc/640w.avif 640w",
    );
  });

  it("leaves url equal to the original fallback so imageUrl stays authoritative", () => {
    expect(toResponsiveImage(FALLBACK_URL, completedAsset()).url).toBe(FALLBACK_URL);
  });
});
