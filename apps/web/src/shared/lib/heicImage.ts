const HEIC_JPEG_QUALITY = 0.9;

const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

const HEIC_FILE_EXTENSION = /\.hei[cf]$/i;

const HEIC_CONVERSION_FAILED_MESSAGE =
  "We couldn't read this HEIC photo. Please upload a JPEG or PNG instead.";

export class HeicConversionError extends Error {
  constructor(conversionFailureCause: unknown) {
    super(HEIC_CONVERSION_FAILED_MESSAGE, { cause: conversionFailureCause });
    this.name = "HeicConversionError";
  }
}

export const isHeicImage = (file: File): boolean =>
  HEIC_MIME_TYPES.has(file.type.toLowerCase()) || HEIC_FILE_EXTENSION.test(file.name);

export const toUploadableImage = async (file: File): Promise<File> => {
  if (!isHeicImage(file)) return file;

  try {
    const { heicTo } = await import("heic-to/csp");
    const jpeg = await heicTo({ blob: file, type: "image/jpeg", quality: HEIC_JPEG_QUALITY });
    const jpegName = `${file.name.replace(HEIC_FILE_EXTENSION, "")}.jpg`;
    return new File([jpeg], jpegName, { type: "image/jpeg", lastModified: file.lastModified });
  } catch (conversionFailure) {
    throw new HeicConversionError(conversionFailure);
  }
};
