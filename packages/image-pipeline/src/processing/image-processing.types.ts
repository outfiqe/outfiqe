export type ImageOutputFormat = "avif" | "webp" | "jpeg";

export type QualityTier = "standard" | "hero";

export type ImageMetadataSummary = {
  width: number;
  height: number;
  format: string;
  bytes: number;
};

export type ResizedVariant = {
  width: number;
  buffer: Buffer;
};

export type EncodedVariant = {
  width: number;
  format: ImageOutputFormat;
  buffer: Buffer;
  bytes: number;
};

export type ThumbnailResult = {
  thumbnail: EncodedVariant;
  lqip: string;
};
