export const MAX_UPLOAD_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_UPLOAD_FILES = 1;
export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);

export const IMAGE_PROCESSING_UPLOAD_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const IMAGE_PROCESSING_UPLOAD_RATE_LIMIT_MAX = 20;
