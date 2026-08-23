import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { getAuthPrincipal, requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  AutocompleteQuery,
  CommentIdParams,
  CommentsQuery,
  CreateCommentBody,
  CreateCreatorLookBody,
  CreateReplyBody,
  FeedQuery,
  ListCreatorLooksQuery,
  ListSavedQuery,
  LookIdParams,
  RecordViewBody,
  RepliesQuery,
  SearchCreatorLooksQuery,
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

  async getOwn(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { lookId } = validated.params<LookIdParams>(res);

    const look = await creatorLookService.getOwn(lookId, userId);
    sendSuccess(res, look, "Post detail.");
  },

  async getPublic(_req: Request, res: Response) {
    const { lookId } = validated.params<LookIdParams>(res);
    const principal = getAuthPrincipal(res);

    const post = await creatorLookService.getPublicById(lookId, principal?.userId);
    sendSuccess(res, post, "Post.");
  },

  async update(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { lookId } = validated.params<LookIdParams>(res);
    const body = validated.body<CreateCreatorLookBody>(res);

    const look = await creatorLookService.update(lookId, userId, body);
    sendSuccess(res, look, "Post updated.");
  },

  async remove(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { lookId } = validated.params<LookIdParams>(res);

    await creatorLookService.remove(lookId, userId);
    sendSuccess(res, { deleted: true }, "Post deleted.");
  },

  async listSaved(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListSavedQuery>(res);
    const page = await creatorLookService.listMySaved(userId, query);

    sendSuccess(res, page, "Saved looks.");
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

  async search(_req: Request, res: Response) {
    const viewerId = getAuthPrincipal(res)?.userId;
    const query = validated.query<SearchCreatorLooksQuery>(res);

    const page = await creatorLookService.search(viewerId, query);
    sendSuccess(res, page, "Posts.");
  },

  async autocomplete(_req: Request, res: Response) {
    const query = validated.query<AutocompleteQuery>(res);
    const suggestions = await creatorLookService.autocomplete(query);

    sendSuccess(res, suggestions, "Suggestions.");
  },

  async trendingTags(_req: Request, res: Response) {
    const tags = await creatorLookService.trendingTags();
    sendSuccess(res, { tags }, "Trending tags.");
  },

  async like(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { lookId } = validated.params<LookIdParams>(res);

    const { liked, likeCount } = await creatorLookService.like(lookId, userId);
    sendSuccess(res, { liked, likeCount }, "Liked.");
  },

  async unlike(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { lookId } = validated.params<LookIdParams>(res);

    const { liked, likeCount } = await creatorLookService.unlike(lookId, userId);
    sendSuccess(res, { liked, likeCount }, "Unliked.");
  },

  async save(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { lookId } = validated.params<LookIdParams>(res);

    const { saved, saveCount } = await creatorLookService.save(lookId, userId);
    sendSuccess(res, { saved, saveCount }, "Saved.");
  },

  async unsave(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { lookId } = validated.params<LookIdParams>(res);

    const { saved, saveCount } = await creatorLookService.unsave(lookId, userId);
    sendSuccess(res, { saved, saveCount }, "Unsaved.");
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

  async listReplies(_req: Request, res: Response) {
    const { lookId, commentId } = validated.params<CommentIdParams>(res);
    const query = validated.query<RepliesQuery>(res);

    const page = await creatorLookService.listReplies(lookId, commentId, query);
    sendSuccess(res, page, "Replies.");
  },

  async addReply(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { lookId, commentId } = validated.params<CommentIdParams>(res);
    const { body } = validated.body<CreateReplyBody>(res);

    const reply = await creatorLookService.addReply(lookId, commentId, userId, body);
    sendSuccess(res, reply, "Reply added.", CREATED_STATUS);
  },

  async recordTagClick(_req: Request, res: Response) {
    const viewerId = getAuthPrincipal(res)?.userId;
    const { lookId, productId } = validated.params<TagClickParams>(res);
    const body = validated.body<TagClickBody>(res);

    await creatorLookService.recordTagClick(lookId, productId, viewerId, body);
    sendSuccess(res, { recorded: true }, "Recorded.");
  },

  async recordView(req: Request, res: Response) {
    const viewerId = getAuthPrincipal(res)?.userId;
    const { lookId } = validated.params<LookIdParams>(res);
    const body = validated.body<RecordViewBody>(res);

    await creatorLookService.recordView(lookId, viewerId, req.headers["user-agent"], body);
    sendSuccess(res, { recorded: true }, "Recorded.");
  },
};
