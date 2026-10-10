import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

import { heroSlideRepository } from "./hero-slide.repository.js";
import type { CreateHeroSlideBody, UpdateHeroSlideBody } from "./hero-slide.schemas.js";
import type { HeroSlideRecord, PublicHeroSlide } from "./hero-slide.types.js";
import { toPublicHeroSlide } from "./hero-slide.utils.js";

const requireHeroSlide = async (id: string): Promise<HeroSlideRecord> => {
  const slide = await heroSlideRepository.findById(id);
  if (!slide) throw new AppError("NOT_FOUND", "Hero slide not found.", HTTP_STATUS.NOT_FOUND);
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
