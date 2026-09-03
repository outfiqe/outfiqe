import { heicTo } from "heic-to/csp";
import { describe, expect, it, vi } from "vitest";

import { HeicConversionError, isHeicImage, toUploadableImage } from "./heicImage";

vi.mock("heic-to/csp", () => ({
  heicTo: vi.fn(),
}));

const heicToMock = vi.mocked(heicTo);

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
    expect(heicToMock).not.toHaveBeenCalled();
  });

  it("converts a HEIC file to a jpeg File with a .jpg name", async () => {
    heicToMock.mockResolvedValueOnce(new Blob(["jpeg-bytes"], { type: "image/jpeg" }));

    const converted = await toUploadableImage(file("IMG_1964.HEIC", "image/heic"));

    expect(converted).toBeInstanceOf(File);
    expect(converted.name).toBe("IMG_1964.jpg");
    expect(converted.type).toBe("image/jpeg");
    expect(heicToMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "image/jpeg", quality: 0.9 }),
    );
  });

  it("throws a HeicConversionError that keeps the original failure as its cause", async () => {
    const decoderFailure = { code: 1, message: "ERR_LIBHEIF" };
    heicToMock.mockRejectedValueOnce(decoderFailure);

    const rejection = await toUploadableImage(file("IMG_1964.HEIC", "image/heic")).catch(
      (error: unknown) => error,
    );

    expect(rejection).toBeInstanceOf(HeicConversionError);
    expect((rejection as HeicConversionError).message).toMatch(/JPEG or PNG/);
    expect((rejection as HeicConversionError).cause).toBe(decoderFailure);
  });
});
