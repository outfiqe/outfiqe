export const BREAKPOINT_WIDTHS_PX = [320, 640, 1080, 1920] as const;

export const THUMBNAIL_WIDTH_PX = 320;

export const LQIP_WIDTH_PX = 20;
export const LQIP_BLUR_SIGMA = 2;
export const LQIP_JPEG_QUALITY = 40;

export const STANDARD_IMAGE_QUALITY = 80;
export const HERO_IMAGE_QUALITY = 88;
export const JPEG_CHROMA_SUBSAMPLING = "4:2:0";

export const MAX_DECODED_PIXELS = 40_000_000;
export const MAX_INPUT_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const SUPPORTED_INPUT_FORMATS = ["jpeg", "png", "webp", "avif", "heif", "gif"] as const;
