import { describe, expect, it } from "vitest";

import { isHeicImage, toUploadableImage } from "./heicImage";

const file = (name: string, type: string) => new File([new Uint8Array([1, 2, 3])], name, { type });

describe("isHeicImage", () => {
  it("matches by MIME type", () => {
    expect(isHeicImage(file("photo", "image/heic"))).toBe(true);
    expect(isHeicImage(file("photo", "image/heif"))).toBe(true);
    expect(isHeicImage(file("photo", "IMAGE/HEIC"))).toBe(true);
  });

  it("matches by extension when the browser reports no MIME type", () => {
    expect(isHeicImage(file("IMG_0001.HEIC", ""))).toBe(true);
    expect(isHeicImage(file("clip.heif", ""))).toBe(true);
  });

  it("does not match other image formats", () => {
    expect(isHeicImage(file("photo.jpg", "image/jpeg"))).toBe(false);
    expect(isHeicImage(file("photo.png", "image/png"))).toBe(false);
    expect(isHeicImage(file("photo.webp", "image/webp"))).toBe(false);
  });
});

describe("toUploadableImage", () => {
  it("returns a non-HEIC file untouched without loading the decoder", async () => {
    const jpeg = file("photo.jpg", "image/jpeg");
    await expect(toUploadableImage(jpeg)).resolves.toBe(jpeg);
  });
});
