import type { EncodedVariantDescriptor } from "@outfiqe/image-pipeline";
import type { ResponsiveImage, ResponsiveImageFormat, ResponsiveImageSource } from "@outfiqe/types";
import { z } from "zod";

import { env } from "#config/env.config.js";
import { ImageProcessingStatus } from "#generated/prisma/enums.js";

export const IMAGE_ASSET_PUBLIC_PATH_SEGMENT = "image-processing-assets";

export const imageAssetPublicBaseUrl = (): string =>
  `${env.API_PUBLIC_URL.replace(/\/+$/, "")}/${IMAGE_ASSET_PUBLIC_PATH_SEGMENT}`;

export const encodedImageVariantsSchema = z.array(
  z.object({
    width: z.number(),
    format: z.enum(["avif", "webp", "jpeg"]),
    storageKey: z.string(),
    bytes: z.number(),
  }),
);

const RESPONSIVE_IMAGE_FORMAT_PREFERENCE: ResponsiveImageFormat[] = ["avif", "webp", "jpeg"];

export const RESPONSIVE_IMAGE_ASSET_SELECT = {
  status: true,
  encodedVariants: true,
  lqip: true,
} as const;

export type ImageAssetForResponsiveImage = {
  status: ImageProcessingStatus;
  encodedVariants: unknown;
  lqip: string | null;
};

const toVariantUrl = (storageKey: string): string =>
  new URL(storageKey, `${imageAssetPublicBaseUrl()}/`).toString();

const toSourceForFormat = (
  format: ResponsiveImageFormat,
  variants: EncodedVariantDescriptor[],
): ResponsiveImageSource | null => {
  const ascendingByWidth = variants
    .filter((variant) => variant.format === format)
    .sort((left, right) => left.width - right.width);
  if (ascendingByWidth.length === 0) return null;
  return {
    format,
    srcSet: ascendingByWidth
      .map((variant) => `${toVariantUrl(variant.storageKey)} ${variant.width}w`)
      .join(", "),
  };
};

export const toResponsiveImage = (
  fallbackUrl: string,
  asset: ImageAssetForResponsiveImage | null,
): ResponsiveImage => {
  const completedVariants =
    asset?.status === ImageProcessingStatus.COMPLETED
      ? encodedImageVariantsSchema.safeParse(asset.encodedVariants)
      : null;
  const encodedVariants = completedVariants?.success ? completedVariants.data : [];

  if (encodedVariants.length === 0) {
    return { url: fallbackUrl, lqip: asset?.lqip ?? null, sources: [] };
  }

  const sources = RESPONSIVE_IMAGE_FORMAT_PREFERENCE.map((format) =>
    toSourceForFormat(format, encodedVariants),
  ).filter((source): source is ResponsiveImageSource => source !== null);

  return { url: fallbackUrl, lqip: asset?.lqip ?? null, sources };
};
