const HEIC_JPEG_QUALITY = 0.9;

const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

const HEIC_FILE_EXTENSION = /\.hei[cf]$/i;

export const isHeicImage = (file: File): boolean =>
  HEIC_MIME_TYPES.has(file.type.toLowerCase()) || HEIC_FILE_EXTENSION.test(file.name);

export const toUploadableImage = async (file: File): Promise<File> => {
  if (!isHeicImage(file)) return file;

  const { default: heic2any } = await import("heic2any");
  const decoded = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: HEIC_JPEG_QUALITY,
  });
  const jpeg = Array.isArray(decoded) ? decoded[0] : decoded;
  if (!jpeg) return file;

  const jpegName = `${file.name.replace(HEIC_FILE_EXTENSION, "")}.jpg`;
  return new File([jpeg], jpegName, { type: "image/jpeg", lastModified: file.lastModified });
};
