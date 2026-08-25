import sharp from "sharp";

import type { ResizedVariant } from "./image-processing.types.js";
import { validateImageBuffer } from "./image-validation.js";

export const resizeImageToWidth = async (buffer: Buffer, width: number): Promise<Buffer> =>
  sharp(buffer)
    .rotate()
    .resize({ width, withoutEnlargement: true, kernel: sharp.kernel.lanczos3 })
    .toBuffer();

export const generateResizedVariants = async (
  buffer: Buffer,
  breakpointWidthsPx: readonly number[],
): Promise<ResizedVariant[]> => {
  const { width: originalWidth } = await validateImageBuffer(buffer);

  const targetWidths = breakpointWidthsPx.filter((width) => width <= originalWidth);
  if (targetWidths.length === 0) {
    targetWidths.push(originalWidth);
  }

  return Promise.all(
    targetWidths.map(async (width) => ({
      width,
      buffer: await resizeImageToWidth(buffer, width),
    })),
  );
};
