import type { Request, Response } from "express";

import { creatorService } from "./creator.service.js";

import { sendSuccess } from "#lib/api-response.utils.js";

import { getAuthPrincipal } from "../../shared/middlewares/require-auth.js";
import { validated } from "../../shared/middlewares/validate.js";

import type { AuthPrincipal } from "#types/token.types.js";
import type { CreatorUserIdParam, ListCreatorsQuery } from "./creator.schemas.js";

const requirePrincipal = (res: Response): AuthPrincipal => {
  const principal = getAuthPrincipal(res);
  if (!principal) throw new Error("reached without an auth principal");
  return principal;
};

export const creatorController = {
  async apply(_req: Request, res: Response) {
    const { userId } = requirePrincipal(res);
    const profile = await creatorService.apply(userId);

    sendSuccess(res, profile, "Creator application submitted.");
  },

  async me(_req: Request, res: Response) {
    const { userId } = requirePrincipal(res);
    const profile = await creatorService.getMine(userId);

    sendSuccess(res, profile, "Your creator profile.");
  },

  async list(_req: Request, res: Response) {
    const { status } = validated.query<ListCreatorsQuery>(res);
    const profiles = await creatorService.list(status);

    sendSuccess(res, profiles, "Creators.");
  },

  async approve(_req: Request, res: Response) {
    const { userId } = validated.params<CreatorUserIdParam>(res);
    const principal = requirePrincipal(res);

    await creatorService.approve(userId, principal.userId);
    sendSuccess(res, null, "Creator approved.");
  },

  async reject(_req: Request, res: Response) {
    const { userId } = validated.params<CreatorUserIdParam>(res);
    const principal = requirePrincipal(res);

    await creatorService.reject(userId, principal.userId);
    sendSuccess(res, null, "Creator rejected.");
  },
};
