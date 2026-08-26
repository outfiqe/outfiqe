import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { createTestImageBuffer } from "../testing/fixtures.js";
import { encodeImageAs, encodeVariantsForWidth, qualityForTier } from "./image-optimize.js";
import { HERO_IMAGE_QUALITY, STANDARD_IMAGE_QUALITY } from "./image-processing.constants.js";

describe("qualityForTier", () => {
  it("returns the standard quality for feed images", () => {
    expect(qualityForTier("standard")).toBe(STANDARD_IMAGE_QUALITY);
  });

  it("returns the higher quality for hero/product images", () => {
    expect(qualityForTier("hero")).toBe(HERO_IMAGE_QUALITY);
  });
});

describe("encodeImageAs", () => {
  it("encodes a jpeg using mozjpeg with the requested quality", async () => {
    const source = await createTestImageBuffer(640, 480, "jpeg");
    const encoded = await encodeImageAs(source, "jpeg", 80);

    const metadata = await sharp(encoded).metadata();
    expect(metadata.format).toBe("jpeg");
  });

  it("encodes webp and avif variants that sharp can decode back", async () => {
    const source = await createTestImageBuffer(320, 240, "jpeg");

    const webp = await encodeImageAs(source, "webp", 80);
    const avif = await encodeImageAs(source, "avif", 80);

    expect((await sharp(webp).metadata()).format).toBe("webp");
    expect((await sharp(avif).metadata()).format).toMatch(/^(avif|heif)$/);
  });

  it("produces a smaller (or equal) jpeg output than a source PNG for a photographic image", async () => {
    const source = await createTestImageBuffer(800, 600, "png");
    const encoded = await encodeImageAs(source, "jpeg", 80);

    expect(encoded.byteLength).toBeLessThan(source.byteLength);
  });
});

describe("encodeVariantsForWidth", () => {
  it("produces avif, webp, and jpeg for a single resized width", async () => {
    const buffer = await createTestImageBuffer(640, 480, "jpeg");

    const variants = await encodeVariantsForWidth({ width: 640, buffer }, "standard");

    expect(variants.map((variant) => variant.format).sort()).toEqual(["avif", "jpeg", "webp"]);
    for (const variant of variants) {
      expect(variant.width).toBe(640);
      expect(variant.bytes).toBe(variant.buffer.byteLength);
    }
  });
});
