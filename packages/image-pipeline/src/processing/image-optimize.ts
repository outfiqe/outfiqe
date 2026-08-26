import sharp from "sharp";

import {
  HERO_IMAGE_QUALITY,
  JPEG_CHROMA_SUBSAMPLING,
  STANDARD_IMAGE_QUALITY,
} from "./image-processing.constants.js";
import type {
  EncodedVariant,
  ImageOutputFormat,
  QualityTier,
  ResizedVariant,
} from "./image-processing.types.js";

export const qualityForTier = (tier: QualityTier): number =>
  tier === "hero" ? HERO_IMAGE_QUALITY : STANDARD_IMAGE_QUALITY;

export const encodeImageAs = async (
  buffer: Buffer,
  format: ImageOutputFormat,
  quality: number,
): Promise<Buffer> => {
  const pipeline = sharp(buffer);
  switch (format) {
    case "avif":
      return pipeline.avif({ quality }).toBuffer();
    case "webp":
      return pipeline.webp({ quality }).toBuffer();
    case "jpeg":
      return pipeline
        .jpeg({ quality, mozjpeg: true, chromaSubsampling: JPEG_CHROMA_SUBSAMPLING })
        .toBuffer();
  }
};

const OUTPUT_FORMATS: readonly ImageOutputFormat[] = ["avif", "webp", "jpeg"];

export const encodeVariantsForWidth = async (
  resizedVariant: ResizedVariant,
  qualityTier: QualityTier,
): Promise<EncodedVariant[]> => {
  const { buffer, width } = resizedVariant;
  const quality = qualityForTier(qualityTier);
  return Promise.all(
    OUTPUT_FORMATS.map(async (format) => {
      const encodedBuffer = await encodeImageAs(buffer, format, quality);
      return { width, format, buffer: encodedBuffer, bytes: encodedBuffer.byteLength };
    }),
  );
};
