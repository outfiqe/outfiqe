import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";
import { collectionRepository } from "#modules/collections/collection.repository.js";

import { heroSlideRepository } from "./hero-slide.repository.js";
import type { CreateHeroSlideBody, UpdateHeroSlideBody } from "./hero-slide.schemas.js";
import type { HeroSlideRecord, PublicHeroSlide } from "./hero-slide.types.js";
import { toPublicHeroSlide } from "./hero-slide.utils.js";

const COLLECTION_PAGE_PREFIX = "/collections/";
const MISTYPED_COLLECTION_PAGE_PREFIX = "/collection/";
const URL_SLUG_END = /[/?#]/;

const ctaTargetNotFoundError = () =>
  new AppError(
    "HERO_CTA_TARGET_NOT_FOUND",
    "That button link goes to a collection that doesn't exist or isn't published.",
    HTTP_STATUS.UNPROCESSABLE_ENTITY,
  );

const assertCtaTargetExists = async (ctaHref: string): Promise<void> => {
  if (ctaHref.startsWith(MISTYPED_COLLECTION_PAGE_PREFIX)) throw ctaTargetNotFoundError();
  if (!ctaHref.startsWith(COLLECTION_PAGE_PREFIX)) return;

  const [slug = ""] = ctaHref.slice(COLLECTION_PAGE_PREFIX.length).split(URL_SLUG_END);
  const collection = await collectionRepository.findPublicBySlug(slug);
  if (!collection) throw ctaTargetNotFoundError();
};

const requireHeroSlide = async (id: string): Promise<HeroSlideRecord> => {
  const slide = await heroSlideRepository.findById(id);
  if (!slide) throw new AppError("NOT_FOUND", "Hero slide not found.", HTTP_STATUS.NOT_FOUND);
  return slide;
};

export const heroSlideService = {
  async create(input: CreateHeroSlideBody): Promise<HeroSlideRecord> {
    await assertCtaTargetExists(input.ctaHref);
    return heroSlideRepository.create(input);
  },

  async update(id: string, input: UpdateHeroSlideBody): Promise<HeroSlideRecord> {
    await requireHeroSlide(id);
    if (input.ctaHref) await assertCtaTargetExists(input.ctaHref);
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
