import jsQrModule from "jsqr";
import sharp from "sharp";

import { QR_DECODE_PASSES, RGBA_CHANNEL_COUNT } from "./bank-qr-verification.constants.js";
import type { QrDecodePass } from "./bank-qr-verification.types.js";

const { default: scanQrCodeInPixels } = jsQrModule;

const decodeQrTextInPass = async (
  imageBuffer: Buffer,
  { maxDimensionPx, shouldNormaliseContrast }: QrDecodePass,
): Promise<string | null> => {
  const resizedImage = sharp(imageBuffer).rotate().resize({
    width: maxDimensionPx,
    height: maxDimensionPx,
    fit: "inside",
    withoutEnlargement: true,
  });
  const preparedImage = shouldNormaliseContrast ? resizedImage.normalise() : resizedImage;

  const { data: rgbaPixels, info } = await preparedImage
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== RGBA_CHANNEL_COUNT) return null;

  const decodedQr = scanQrCodeInPixels(
    new Uint8ClampedArray(rgbaPixels.buffer, rgbaPixels.byteOffset, rgbaPixels.length),
    info.width,
    info.height,
    { inversionAttempts: "attemptBoth" },
  );
  return decodedQr?.data || null;
};

export const decodeQrTextFromImage = async (imageBuffer: Buffer): Promise<string | null> => {
  for (const decodePass of QR_DECODE_PASSES) {
    const qrText = await decodeQrTextInPass(imageBuffer, decodePass);
    if (qrText) return qrText;
  }
  return null;
};
