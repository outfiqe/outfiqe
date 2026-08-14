import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";

import type {
  CreateHeroSlideBody,
  HeroSlideIdParam,
  UpdateHeroSlideBody,
} from "./heroSlide.schemas.js";
import { heroSlideService } from "./heroSlide.service.js";

const CREATED_STATUS = 201;

export const heroSlideController = {
  async create(_req: Request, res: Response) {
    const body = validated.body<CreateHeroSlideBody>(res);
    const slide = await heroSlideService.create(body);
    sendSuccess(res, slide, "Hero slide created.", CREATED_STATUS);
  },

  async update(_req: Request, res: Response) {
    const { id } = validated.params<HeroSlideIdParam>(res);
    const body = validated.body<UpdateHeroSlideBody>(res);
    const slide = await heroSlideService.update(id, body);
    sendSuccess(res, slide, "Hero slide updated.");
  },

  async listAll(_req: Request, res: Response) {
    const slides = await heroSlideService.listAll();
    sendSuccess(res, slides, "Hero slides.");
  },

  async listPublic(_req: Request, res: Response) {
    const slides = await heroSlideService.listPublic();
    sendSuccess(res, slides, "Hero slides.");
  },
};
