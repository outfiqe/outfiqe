import type { HeroSlideStatus } from "../../generated/prisma/enums.js";

export type HeroSlideRecord = {
  id: string;
  tag: string;
  title: string;
  description: string;
  imageUrl: string | null;
  ctaLabel: string;
  ctaHref: string;
  status: HeroSlideStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateHeroSlideInput = {
  tag: string;
  title: string;
  description: string;
  imageUrl?: string;
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
  ctaLabel: string;
  ctaHref: string;
};
