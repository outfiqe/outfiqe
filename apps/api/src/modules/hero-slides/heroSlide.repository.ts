import { prisma } from "#db/prisma.js";
import { HeroSlideStatus } from "#generated/prisma/enums.js";
import { RESPONSIVE_IMAGE_ASSET_SELECT } from "#lib/responsive-image.utils.js";

import type {
  CreateHeroSlideInput,
  HeroSlideRecord,
  HeroSlideWithImageAsset,
  UpdateHeroSlideInput,
} from "./heroSlide.types.js";

export const heroSlideRepository = {
  async create(input: CreateHeroSlideInput): Promise<HeroSlideRecord> {
    return prisma.heroSlide.create({ data: input });
  },

  async update(id: string, input: UpdateHeroSlideInput): Promise<HeroSlideRecord> {
    return prisma.heroSlide.update({ where: { id }, data: input });
  },

  async findById(id: string): Promise<HeroSlideRecord | null> {
    return prisma.heroSlide.findUnique({ where: { id } });
  },

  async listAll(): Promise<HeroSlideRecord[]> {
    return prisma.heroSlide.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  },

  async listPublic(): Promise<HeroSlideWithImageAsset[]> {
    return prisma.heroSlide.findMany({
      where: { status: HeroSlideStatus.PUBLISHED },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: { imageAsset: { select: RESPONSIVE_IMAGE_ASSET_SELECT } },
    });
  },
};
