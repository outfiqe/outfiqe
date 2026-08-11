import { z } from "zod";

import { apiClient } from "@/lib/apiClient";
import { heroSlideSchema, type HeroSlide, type HeroSlideStatusValue } from "./schemas";

const listSchema = z.array(heroSlideSchema);

export type CreateHeroSlideInput = {
  tag: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl?: string;
};

export const heroSlidesApi = {
  async list(): Promise<HeroSlide[]> {
    const res = await apiClient.get<HeroSlide[]>("/hero-slides/admin");
    return listSchema.parse(res.data);
  },

  async create(input: CreateHeroSlideInput): Promise<HeroSlide> {
    const res = await apiClient.post<HeroSlide>("/hero-slides", input);
    return heroSlideSchema.parse(res.data);
  },

  async setStatus(id: string, status: HeroSlideStatusValue): Promise<HeroSlide> {
    const res = await apiClient.patch<HeroSlide>(`/hero-slides/${id}`, { status });
    return heroSlideSchema.parse(res.data);
  },

  async setImage(id: string, imageUrl: string): Promise<HeroSlide> {
    const res = await apiClient.patch<HeroSlide>(`/hero-slides/${id}`, { imageUrl });
    return heroSlideSchema.parse(res.data);
  },
};
