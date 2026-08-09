import type { Request, Response } from "express";

import { followService } from "./follow.service.js";

import { sendSuccess } from "#lib/api-response.utils.js";

import { getAuthPrincipal } from "../../shared/middlewares/require-auth.js";
import { validated } from "../../shared/middlewares/validate.js";

import type { AuthPrincipal } from "#types/token.types.js";
import type { FollowParams } from "./follow.schemas.js";

const requirePrincipal = (res: Response): AuthPrincipal => {
  const principal = getAuthPrincipal(res);
  if (!principal) throw new Error("reached without an auth principal");
  return principal;
};

export const followController = {
  async follow(_req: Request, res: Response) {
    const { userId } = requirePrincipal(res);
    const { targetType, targetId } = validated.params<FollowParams>(res);

    const result = await followService.follow(userId, targetType, targetId);
    sendSuccess(res, result, "Followed.");
  },

  async unfollow(_req: Request, res: Response) {
    const { userId } = requirePrincipal(res);
    const { targetType, targetId } = validated.params<FollowParams>(res);

    const result = await followService.unfollow(userId, targetType, targetId);
    sendSuccess(res, result, "Unfollowed.");
  },

  async suggestedCreators(_req: Request, res: Response) {
    const { userId } = requirePrincipal(res);
    const creators = await followService.suggestedCreators(userId);
    sendSuccess(res, { creators }, "Suggested creators.");
  },
};
