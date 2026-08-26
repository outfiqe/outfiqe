import sharp from "sharp";

import { encodeImageAs, qualityForTier } from "./image-optimize.js";
import {
  LQIP_BLUR_SIGMA,
  LQIP_JPEG_QUALITY,
  LQIP_WIDTH_PX,
  THUMBNAIL_WIDTH_PX,
} from "./image-processing.constants.js";
import type { ThumbnailResult } from "./image-processing.types.js";
import { resizeImageToWidth } from "./image-resize.js";

export const generateLqip = async (buffer: Buffer): Promise<string> => {
  const lqipBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: LQIP_WIDTH_PX, withoutEnlargement: true })
    .blur(LQIP_BLUR_SIGMA)
    .jpeg({ quality: LQIP_JPEG_QUALITY })
    .toBuffer();
  return `data:image/jpeg;base64,${lqipBuffer.toString("base64")}`;
};

export const generateThumbnail = async (buffer: Buffer): Promise<ThumbnailResult> => {
  const [resizedBuffer, lqip] = await Promise.all([
    resizeImageToWidth(buffer, THUMBNAIL_WIDTH_PX),
    generateLqip(buffer),
  ]);
  const quality = qualityForTier("standard");
  const encodedBuffer = await encodeImageAs(resizedBuffer, "webp", quality);

  return {
    thumbnail: {
      width: THUMBNAIL_WIDTH_PX,
      format: "webp",
      buffer: encodedBuffer,
      bytes: encodedBuffer.byteLength,
    },
    lqip,
  };
};
