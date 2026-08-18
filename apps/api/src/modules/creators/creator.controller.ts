import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { getAuthPrincipal, requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";
import { creatorLookService } from "#modules/creator-looks/creatorLook.service.js";

import type {
  CreatorHandleParam,
  CreatorUserIdParam,
  ListCreatorLooksQuery,
  ListCreatorsQuery,
  SearchCreatorsQuery,
  UpdateCreatorProfileBody,
} from "./creator.schemas.js";
import { creatorService } from "./creator.service.js";

export const creatorController = {
  async apply(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const profile = await creatorService.apply(userId);

    sendSuccess(res, profile, "Creator application submitted.");
  },

  async me(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const profile = await creatorService.getMine(userId);

    sendSuccess(res, profile, "Your creator profile.");
  },

  async updateMe(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const body = validated.body<UpdateCreatorProfileBody>(res);

    const profile = await creatorService.updateMe(userId, body);
    sendSuccess(res, profile, "Profile updated.");
  },

  async search(_req: Request, res: Response) {
    const query = validated.query<SearchCreatorsQuery>(res);
    const page = await creatorService.search(query);

    sendSuccess(res, page, "Creators.");
  },

  async list(_req: Request, res: Response) {
    const query = validated.query<ListCreatorsQuery>(res);
    const page = await creatorService.list(query);

    sendSuccess(res, page, "Creators.");
  },

  async approve(_req: Request, res: Response) {
    const { userId } = validated.params<CreatorUserIdParam>(res);
    const principal = requireAuthPrincipal(res);

    await creatorService.approve(userId, principal.userId);
    sendSuccess(res, null, "Creator approved.");
  },

  async reject(_req: Request, res: Response) {
    const { userId } = validated.params<CreatorUserIdParam>(res);
    const principal = requireAuthPrincipal(res);

    await creatorService.reject(userId, principal.userId);
    sendSuccess(res, null, "Creator rejected.");
  },

  async getPublicByHandle(_req: Request, res: Response) {
    const { handle } = validated.params<CreatorHandleParam>(res);
    const principal = getAuthPrincipal(res);

    const profile = await creatorService.getPublicProfile(handle, principal?.userId);
    sendSuccess(res, profile, "Creator.");
  },

  async listLooksByHandle(_req: Request, res: Response) {
    const { handle } = validated.params<CreatorHandleParam>(res);
    const query = validated.query<ListCreatorLooksQuery>(res);
    const principal = getAuthPrincipal(res);

    const profile = await creatorService.getPublicProfile(handle);
    const page = await creatorLookService.listPublicByCreator(
      profile.userId,
      query,
      principal?.userId,
    );
    sendSuccess(res, page, "Creator's posts.");
  },
};
