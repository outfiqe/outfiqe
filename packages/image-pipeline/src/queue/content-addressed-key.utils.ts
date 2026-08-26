const EXTENSION_BY_FORMAT: Record<string, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  avif: "avif",
  heif: "avif",
  gif: "gif",
};

export const extensionForFormat = (format: string): string => EXTENSION_BY_FORMAT[format] ?? "bin";

export const originalStorageKeyFor = (checksum: string, format: string): string =>
  `originals/${checksum}.${extensionForFormat(format)}`;

export const resizedStorageKeyFor = (checksum: string, width: number): string =>
  `resized/${checksum}/${width}w.bin`;

export const encodedVariantStorageKeyFor = (
  checksum: string,
  width: number,
  format: string,
): string => `variants/${checksum}/${width}w.${extensionForFormat(format)}`;

export const thumbnailStorageKeyFor = (checksum: string): string => `thumbnails/${checksum}.webp`;
