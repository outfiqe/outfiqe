import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { FollowParams } from "./follow.schemas.js";
import { followService } from "./follow.service.js";

export const followController = {
  async follow(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { targetType, targetId } = validated.params<FollowParams>(res);

    const result = await followService.follow(userId, targetType, targetId);
    sendSuccess(res, result, "Followed.");
  },

  async unfollow(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { targetType, targetId } = validated.params<FollowParams>(res);

    const result = await followService.unfollow(userId, targetType, targetId);
    sendSuccess(res, result, "Unfollowed.");
  },

  async suggestedCreators(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const creators = await followService.suggestedCreators(userId);
    sendSuccess(res, { creators }, "Suggested creators.");
  },
};
