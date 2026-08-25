import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { createTestImageBuffer } from "../testing/fixtures.js";
import { THUMBNAIL_WIDTH_PX } from "./image-processing.constants.js";
import { generateLqip, generateThumbnail } from "./image-thumbnail.js";

describe("generateLqip", () => {
  it("returns a small base64 data URI", async () => {
    const source = await createTestImageBuffer(1920, 1080, "jpeg");

    const lqip = await generateLqip(source);

    expect(lqip.startsWith("data:image/jpeg;base64,")).toBe(true);
    const base64Payload = lqip.split(",")[1] ?? "";
    expect(Buffer.from(base64Payload, "base64").byteLength).toBeLessThan(2000);
  });
});

describe("generateThumbnail", () => {
  it("produces a webp thumbnail at the fixed thumbnail width and an lqip", async () => {
    const source = await createTestImageBuffer(1920, 1080, "jpeg");

    const { thumbnail, lqip } = await generateThumbnail(source);

    expect(thumbnail.format).toBe("webp");
    expect(thumbnail.width).toBe(THUMBNAIL_WIDTH_PX);
    const metadata = await sharp(thumbnail.buffer).metadata();
    expect(metadata.width).toBe(THUMBNAIL_WIDTH_PX);
    expect(lqip.startsWith("data:image/jpeg;base64,")).toBe(true);
  });

  it("never upscales the thumbnail beyond the original width", async () => {
    const source = await createTestImageBuffer(100, 60, "jpeg");

    const { thumbnail } = await generateThumbnail(source);

    const metadata = await sharp(thumbnail.buffer).metadata();
    expect(metadata.width).toBe(100);
  });
});
