import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { getAuthPrincipal, requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  AddOutfitCommentBody,
  ListOutfitsQuery,
  OutfitCommentParam,
  OutfitIdParam,
  PublicBuildsQuery,
} from "./outfit.schemas.js";
import { outfitSocialService } from "./outfit-social.service.js";

const CREATED_STATUS = 201;
const NO_CONTENT_STATUS = 204;

const viewerIdFrom = (res: Response): string | null => getAuthPrincipal(res)?.userId ?? null;

export const outfitSocialController = {
  async listPublic(_req: Request, res: Response) {
    const {
      cursor,
      limit,
      category,
      minPrice,
      maxPrice,
      inStockOnly,
      contributorId,
      brandId,
      sort,
    } = validated.query<PublicBuildsQuery>(res);
    sendSuccess(
      res,
      await outfitSocialService.listPublicBuilds(
        viewerIdFrom(res),
        {
          categorySlug: category,
          minPrice,
          maxPrice,
          isInStockOnly: inStockOnly,
          contributorId,
          brandId,
          sort,
        },
        { cursor, limit },
      ),
      "Public builds.",
    );
  },

  async listSaved(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListOutfitsQuery>(res);
    sendSuccess(res, await outfitSocialService.listSavedBuilds(userId, query), "Saved builds.");
  },

  async getPublic(_req: Request, res: Response) {
    const { id } = validated.params<OutfitIdParam>(res);
    sendSuccess(res, await outfitSocialService.getPublicBuild(viewerIdFrom(res), id), "Build.");
  },

  async like(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<OutfitIdParam>(res);
    sendSuccess(res, await outfitSocialService.setLiked(userId, id, true), "Liked.");
  },

  async unlike(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<OutfitIdParam>(res);
    sendSuccess(res, await outfitSocialService.setLiked(userId, id, false), "Unliked.");
  },

  async save(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<OutfitIdParam>(res);
    sendSuccess(res, await outfitSocialService.setSaved(userId, id, true), "Saved.");
  },

  async unsave(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<OutfitIdParam>(res);
    sendSuccess(res, await outfitSocialService.setSaved(userId, id, false), "Removed from saved.");
  },

  async listComments(_req: Request, res: Response) {
    const { id } = validated.params<OutfitIdParam>(res);
    const query = validated.query<ListOutfitsQuery>(res);
    sendSuccess(
      res,
      await outfitSocialService.listComments(viewerIdFrom(res), id, query),
      "Chimes.",
    );
  },

  async listReplies(_req: Request, res: Response) {
    const { id, commentId } = validated.params<OutfitCommentParam>(res);
    const query = validated.query<ListOutfitsQuery>(res);
    sendSuccess(
      res,
      await outfitSocialService.listReplies(viewerIdFrom(res), id, commentId, query),
      "Replies.",
    );
  },

  async addComment(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<OutfitIdParam>(res);
    const body = validated.body<AddOutfitCommentBody>(res);
    sendSuccess(
      res,
      await outfitSocialService.addComment(userId, id, body),
      "Chime added.",
      CREATED_STATUS,
    );
  },

  async removeComment(_req: Request, res: Response) {
    const principal = requireAuthPrincipal(res);
    const { id, commentId } = validated.params<OutfitCommentParam>(res);
    await outfitSocialService.removeComment(principal, id, commentId);
    res.status(NO_CONTENT_STATUS).end();
  },
};
