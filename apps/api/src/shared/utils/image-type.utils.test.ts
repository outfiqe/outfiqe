import { describe, expect, it } from "vitest";

import {
  detectImageMimeType,
  IMAGE_MIME_TYPE,
  imageExtensionForMimeType,
} from "./image-type.utils.js";

const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const webpHeader = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from("WEBP"),
]);

describe("detectImageMimeType", () => {
  it("recognises a JPEG by its signature", () => {
    expect(detectImageMimeType(jpegHeader)).toBe(IMAGE_MIME_TYPE.JPEG);
  });

  it("recognises a PNG by its signature", () => {
    expect(detectImageMimeType(pngHeader)).toBe(IMAGE_MIME_TYPE.PNG);
  });

  it("recognises a WebP by its RIFF and WEBP markers", () => {
    expect(detectImageMimeType(webpHeader)).toBe(IMAGE_MIME_TYPE.WEBP);
  });

  it("rejects an HTML document disguised with an image content type", () => {
    const disguisedHtml = Buffer.from("<!doctype html><script>alert(1)</script>");
    expect(detectImageMimeType(disguisedHtml)).toBeNull();
  });

  it("rejects an SVG, which can carry script", () => {
    const svg = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>");
    expect(detectImageMimeType(svg)).toBeNull();
  });

  it("detects the image type of a PNG polyglot that also contains HTML", () => {
    const polyglot = Buffer.concat([pngHeader, Buffer.from("<script>alert(1)</script>")]);
    expect(detectImageMimeType(polyglot)).toBe(IMAGE_MIME_TYPE.PNG);
  });

  it("returns null for a buffer shorter than any signature", () => {
    expect(detectImageMimeType(Buffer.from([0xff]))).toBeNull();
  });

  it("does not treat a RIFF container that is not WebP as an image", () => {
    const riffWave = Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.from([0x24, 0x00, 0x00, 0x00]),
      Buffer.from("WAVE"),
    ]);
    expect(detectImageMimeType(riffWave)).toBeNull();
  });
});

describe("imageExtensionForMimeType", () => {
  it("maps each allowed image type to its extension", () => {
    expect(imageExtensionForMimeType(IMAGE_MIME_TYPE.JPEG)).toBe(".jpg");
    expect(imageExtensionForMimeType(IMAGE_MIME_TYPE.PNG)).toBe(".png");
    expect(imageExtensionForMimeType(IMAGE_MIME_TYPE.WEBP)).toBe(".webp");
  });

  it("returns an empty extension for an unknown type", () => {
    expect(imageExtensionForMimeType("text/html")).toBe("");
  });
});
