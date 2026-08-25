import { describe, expect, it } from "vitest";

import { createCorruptImageBuffer, createTestImageBuffer } from "../testing/fixtures.js";
import { MAX_INPUT_FILE_SIZE_BYTES } from "./image-processing.constants.js";
import {
  CorruptImageError,
  ImageDimensionsExceededError,
  ImageTooLargeError,
} from "./image-validation.errors.js";
import { validateImageBuffer } from "./image-validation.js";

describe("validateImageBuffer", () => {
  it("returns metadata for a valid image", async () => {
    const buffer = await createTestImageBuffer(640, 480, "jpeg");

    const metadata = await validateImageBuffer(buffer);

    expect(metadata).toEqual({
      width: 640,
      height: 480,
      format: "jpeg",
      bytes: buffer.byteLength,
    });
  });

  it("rejects a corrupt/non-image buffer", async () => {
    await expect(validateImageBuffer(createCorruptImageBuffer())).rejects.toBeInstanceOf(
      CorruptImageError,
    );
  });

  it("rejects a buffer larger than the max file size", async () => {
    const oversized = Buffer.alloc(MAX_INPUT_FILE_SIZE_BYTES + 1);
    await expect(validateImageBuffer(oversized)).rejects.toBeInstanceOf(ImageTooLargeError);
  });

  it("rejects an image whose decoded pixel count exceeds the cap (decompression bomb guard)", async () => {
    const massiveDimensionImage = await createTestImageBuffer(10000, 10000, "png");
    await expect(validateImageBuffer(massiveDimensionImage)).rejects.toBeInstanceOf(
      ImageDimensionsExceededError,
    );
  });

  it("accepts a single-pixel image without throwing", async () => {
    const buffer = await createTestImageBuffer(1, 1, "png");
    await expect(validateImageBuffer(buffer)).resolves.toMatchObject({ width: 1, height: 1 });
  });
});
