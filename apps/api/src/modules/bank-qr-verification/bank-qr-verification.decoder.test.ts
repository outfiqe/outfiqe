import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { buildBankQrPayload, renderBlankPng, renderQrPng } from "#test/bank-qr-test-codes.js";

import { decodeQrTextFromImage } from "./bank-qr-verification.decoder.js";

const QUARTER_TURN_DEGREES = 90;
const SMALL_IMAGE_WIDTH_PX = 200;

describe("decodeQrTextFromImage", () => {
  it("reads the text of a QR image", async () => {
    const qrText = buildBankQrPayload();

    expect(await decodeQrTextFromImage(await renderQrPng(qrText))).toBe(qrText);
  });

  it("reads a rotated QR photo", async () => {
    const qrText = buildBankQrPayload();
    const rotatedPng = await sharp(await renderQrPng(qrText))
      .rotate(QUARTER_TURN_DEGREES)
      .png()
      .toBuffer();

    expect(await decodeQrTextFromImage(rotatedPng)).toBe(qrText);
  });

  it("reads a QR with light modules on a dark background", async () => {
    const qrText = buildBankQrPayload();
    const invertedPng = await sharp(await renderQrPng(qrText))
      .negate({ alpha: false })
      .png()
      .toBuffer();

    expect(await decodeQrTextFromImage(invertedPng)).toBe(qrText);
  });

  it("reads a small greyscale jpeg screenshot", async () => {
    const qrText = buildBankQrPayload();
    const greyscaleJpeg = await sharp(await renderQrPng(qrText))
      .resize({ width: SMALL_IMAGE_WIDTH_PX })
      .greyscale()
      .jpeg()
      .toBuffer();

    expect(await decodeQrTextFromImage(greyscaleJpeg)).toBe(qrText);
  });

  it("returns null for an image with no QR code", async () => {
    expect(await decodeQrTextFromImage(await renderBlankPng())).toBeNull();
  });

  it("throws for bytes that are not an image", async () => {
    await expect(decodeQrTextFromImage(Buffer.from("not an image"))).rejects.toThrow();
  });
});
