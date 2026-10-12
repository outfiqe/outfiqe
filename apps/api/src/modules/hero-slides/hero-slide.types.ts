import type { ResponsiveImage } from "@outfiqe/types";

import type { HeroSlideStatus } from "#generated/prisma/enums.js";
import type { ImageAssetForResponsiveImage } from "#lib/responsive-image.utils.js";

export type HeroSlideRecord = {
  id: string;
  tag: string;
  title: string;
  description: string;
  imageUrl: string | null;
  imageAssetId: string | null;
  ctaLabel: string;
  ctaHref: string;
  status: HeroSlideStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type HeroSlideWithImageAsset = HeroSlideRecord & {
  imageAsset: ImageAssetForResponsiveImage | null;
};

export type CreateHeroSlideInput = {
  tag: string;
  title: string;
  description: string;
  imageUrl?: string;
  imageAssetId?: string | null;
  ctaLabel: string;
  ctaHref: string;
  status?: HeroSlideStatus;
  sortOrder?: number;
};

export type UpdateHeroSlideInput = Partial<CreateHeroSlideInput>;

export type PublicHeroSlide = {
  id: string;
  tag: string;
  title: string;
  description: string;
  imageUrl: string | null;
  image: ResponsiveImage | null;
  ctaLabel: string;
  ctaHref: string;
};
