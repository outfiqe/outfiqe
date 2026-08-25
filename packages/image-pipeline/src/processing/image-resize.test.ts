import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { createTestImageBuffer } from "../testing/fixtures.js";
import { BREAKPOINT_WIDTHS_PX } from "./image-processing.constants.js";
import { generateResizedVariants, resizeImageToWidth } from "./image-resize.js";

describe("resizeImageToWidth", () => {
  it("resizes down to the requested width", async () => {
    const source = await createTestImageBuffer(1920, 1080, "jpeg");
    const resized = await resizeImageToWidth(source, 640);

    const metadata = await sharp(resized).metadata();
    expect(metadata.width).toBe(640);
    expect(metadata.height).toBe(360);
  });

  it("never upscales beyond the original width", async () => {
    const source = await createTestImageBuffer(200, 200, "jpeg");
    const resized = await resizeImageToWidth(source, 1920);

    const metadata = await sharp(resized).metadata();
    expect(metadata.width).toBe(200);
  });

  it("strips EXIF metadata while baking in orientation", async () => {
    const source = await sharp({
      create: { width: 100, height: 50, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .withExif({ IFD0: { Make: "TestCam" } })
      .jpeg()
      .toBuffer();

    const resized = await resizeImageToWidth(source, 50);

    const metadata = await sharp(resized).metadata();
    expect(metadata.exif).toBeUndefined();
  });
});

describe("generateResizedVariants", () => {
  it("produces one variant per breakpoint at or below the original width", async () => {
    const source = await createTestImageBuffer(1080, 720, "jpeg");

    const variants = await generateResizedVariants(source, BREAKPOINT_WIDTHS_PX);

    expect(variants.map((variant) => variant.width)).toEqual([320, 640, 1080]);
  });

  it("falls back to a single original-width variant when smaller than every breakpoint", async () => {
    const source = await createTestImageBuffer(150, 100, "jpeg");

    const variants = await generateResizedVariants(source, BREAKPOINT_WIDTHS_PX);

    expect(variants).toHaveLength(1);
    expect(variants[0]?.width).toBe(150);
  });
});
