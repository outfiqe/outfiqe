import { AppError } from "#middlewares/error-handler.js";

import { heroSlideRepository } from "./heroSlide.repository.js";
import type { CreateHeroSlideBody, UpdateHeroSlideBody } from "./heroSlide.schemas.js";
import type { HeroSlideRecord, PublicHeroSlide } from "./heroSlide.types.js";
import { toPublicHeroSlide } from "./heroSlide.utils.js";

const NOT_FOUND_STATUS = 404;

const requireHeroSlide = async (id: string): Promise<HeroSlideRecord> => {
  const slide = await heroSlideRepository.findById(id);
  if (!slide) throw new AppError("NOT_FOUND", "Hero slide not found.", NOT_FOUND_STATUS);
  return slide;
};

export const heroSlideService = {
  async create(input: CreateHeroSlideBody): Promise<HeroSlideRecord> {
    return heroSlideRepository.create(input);
  },

  async update(id: string, input: UpdateHeroSlideBody): Promise<HeroSlideRecord> {
    await requireHeroSlide(id);
    return heroSlideRepository.update(id, input);
  },

  async listAll(): Promise<HeroSlideRecord[]> {
    return heroSlideRepository.listAll();
  },

  async listPublic(): Promise<PublicHeroSlide[]> {
    const slides = await heroSlideRepository.listPublic();
    return slides.map(toPublicHeroSlide);
  },
};
