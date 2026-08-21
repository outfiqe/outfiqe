import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  BadgeIdParam,
  UpdateBadgeDisplayBody,
  UpdateFeaturedBadgesBody,
  UpdateTitleBadgeBody,
} from "./badge.schemas.js";
import { badgeService } from "./badge.service.js";

export const badgeController = {
  async listMyCollection(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const collection = await badgeService.listCollectionForUser(userId);
    sendSuccess(res, collection, "Your badge collection.");
  },

  async updateDisplay(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { badgeId } = validated.params<BadgeIdParam>(res);
    const { isDisplayed } = validated.body<UpdateBadgeDisplayBody>(res);

    await badgeService.updateDisplay(userId, badgeId, isDisplayed);
    sendSuccess(res, null, "Badge visibility updated.");
  },

  async updateFeatured(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { badgeIds } = validated.body<UpdateFeaturedBadgesBody>(res);

    await badgeService.updateFeatured(userId, badgeIds);
    sendSuccess(res, null, "Featured badges updated.");
  },

  async updateTitle(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { badgeId } = validated.body<UpdateTitleBadgeBody>(res);

    await badgeService.updateTitle(userId, badgeId);
    sendSuccess(res, null, "Title badge updated.");
  },
};
