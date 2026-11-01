export const IMAGE_MIME_TYPE = {
  JPEG: "image/jpeg",
  PNG: "image/png",
  WEBP: "image/webp",
} as const;

export type ImageMimeType = (typeof IMAGE_MIME_TYPE)[keyof typeof IMAGE_MIME_TYPE];

export const ALLOWED_IMAGE_MIME_TYPES: ReadonlySet<string> = new Set(
  Object.values(IMAGE_MIME_TYPE),
);

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50];
const WEBP_SIGNATURE_OFFSET = 8;

const EXTENSION_BY_IMAGE_MIME_TYPE = new Map<string, string>([
  [IMAGE_MIME_TYPE.JPEG, ".jpg"],
  [IMAGE_MIME_TYPE.PNG, ".png"],
  [IMAGE_MIME_TYPE.WEBP, ".webp"],
]);

const matchesSignatureAt = (buffer: Buffer, signature: number[], offset: number): boolean =>
  buffer.length >= offset + signature.length &&
  signature.every((byte, index) => buffer[offset + index] === byte);

export const detectImageMimeType = (buffer: Buffer): ImageMimeType | null => {
  if (matchesSignatureAt(buffer, JPEG_SIGNATURE, 0)) return IMAGE_MIME_TYPE.JPEG;
  if (matchesSignatureAt(buffer, PNG_SIGNATURE, 0)) return IMAGE_MIME_TYPE.PNG;
  if (
    matchesSignatureAt(buffer, RIFF_SIGNATURE, 0) &&
    matchesSignatureAt(buffer, WEBP_SIGNATURE, WEBP_SIGNATURE_OFFSET)
  ) {
    return IMAGE_MIME_TYPE.WEBP;
  }
  return null;
};

export const imageExtensionForMimeType = (mimeType: string): string =>
  EXTENSION_BY_IMAGE_MIME_TYPE.get(mimeType) ?? "";
