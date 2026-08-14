import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { getAuthPrincipal, requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  CommentsQuery,
  CreateCommentBody,
  CreateCreatorLookBody,
  FeedQuery,
  ListCreatorLooksQuery,
  LookIdParams,
  TagClickBody,
  TagClickParams,
} from "./creatorLook.schemas.js";
import { creatorLookService } from "./creatorLook.service.js";

const CREATED_STATUS = 201;

export const creatorLookController = {
  async create(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const body = validated.body<CreateCreatorLookBody>(res);

    const look = await creatorLookService.create(userId, body);
    sendSuccess(res, look, "Look posted.", CREATED_STATUS);
  },

  async listMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListCreatorLooksQuery>(res);
    const page = await creatorLookService.listMine(userId, query);

    sendSuccess(res, page, "Your looks.");
  },

  async listFeatured(_req: Request, res: Response) {
    const query = validated.query<ListCreatorLooksQuery>(res);
    const page = await creatorLookService.listPublic(query);
    sendSuccess(res, page, "Creator looks.");
  },

  async feed(_req: Request, res: Response) {
    const viewerId = getAuthPrincipal(res)?.userId;
    const query = validated.query<FeedQuery>(res);

    const page = await creatorLookService.feed(viewerId, query);
    sendSuccess(res, page, "Explore feed.");
  },

  async trendingTags(_req: Request, res: Response) {
    const tags = await creatorLookService.trendingTags();
    sendSuccess(res, { tags }, "Trending tags.");
  },

  async like(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { lookId } = validated.params<LookIdParams>(res);

    const { likeCount } = await creatorLookService.like(lookId, userId);
    sendSuccess(res, { likeCount }, "Liked.");
  },

  async unlike(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { lookId } = validated.params<LookIdParams>(res);

    const { likeCount } = await creatorLookService.unlike(lookId, userId);
    sendSuccess(res, { likeCount }, "Unliked.");
  },

  async save(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { lookId } = validated.params<LookIdParams>(res);

    const { saveCount } = await creatorLookService.save(lookId, userId);
    sendSuccess(res, { saveCount }, "Saved.");
  },

  async unsave(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { lookId } = validated.params<LookIdParams>(res);

    const { saveCount } = await creatorLookService.unsave(lookId, userId);
    sendSuccess(res, { saveCount }, "Unsaved.");
  },

  async listComments(_req: Request, res: Response) {
    const { lookId } = validated.params<LookIdParams>(res);
    const query = validated.query<CommentsQuery>(res);

    const page = await creatorLookService.listComments(lookId, query);
    sendSuccess(res, page, "Comments.");
  },

  async addComment(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { lookId } = validated.params<LookIdParams>(res);
    const { body } = validated.body<CreateCommentBody>(res);

    const comment = await creatorLookService.addComment(lookId, userId, body);
    sendSuccess(res, comment, "Comment added.", CREATED_STATUS);
  },

  async recordTagClick(_req: Request, res: Response) {
    const viewerId = getAuthPrincipal(res)?.userId;
    const { lookId, productId } = validated.params<TagClickParams>(res);
    const body = validated.body<TagClickBody>(res);

    await creatorLookService.recordTagClick(lookId, productId, viewerId, body);
    sendSuccess(res, { recorded: true }, "Recorded.");
  },
};
