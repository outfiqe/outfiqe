import sharp from "sharp";

import {
  MAX_DECODED_PIXELS,
  MAX_INPUT_FILE_SIZE_BYTES,
  SUPPORTED_INPUT_FORMATS,
} from "./image-processing.constants.js";
import type { ImageMetadataSummary } from "./image-processing.types.js";
import {
  CorruptImageError,
  ImageDimensionsExceededError,
  ImageTooLargeError,
  UnsupportedImageFormatError,
} from "./image-validation.errors.js";

const isSupportedFormat = (format: string): format is (typeof SUPPORTED_INPUT_FORMATS)[number] =>
  (SUPPORTED_INPUT_FORMATS as readonly string[]).includes(format);

export const validateImageBuffer = async (buffer: Buffer): Promise<ImageMetadataSummary> => {
  if (buffer.byteLength > MAX_INPUT_FILE_SIZE_BYTES) {
    throw new ImageTooLargeError(buffer.byteLength, MAX_INPUT_FILE_SIZE_BYTES);
  }

  let metadata;
  try {
    metadata = await sharp(buffer, { failOn: "error" }).metadata();
  } catch (error) {
    throw new CorruptImageError(error);
  }

  const { width, height, format } = metadata;
  if (!width || !height || !format) {
    throw new CorruptImageError(new Error("Missing width, height, or format in metadata"));
  }

  if (!isSupportedFormat(format)) {
    throw new UnsupportedImageFormatError(format);
  }

  const pixels = width * height;
  if (pixels > MAX_DECODED_PIXELS) {
    throw new ImageDimensionsExceededError(pixels, MAX_DECODED_PIXELS);
  }

  return { width, height, format, bytes: buffer.byteLength };
};
