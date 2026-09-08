import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  ApproveTagBody,
  ListTagReviewsQuery,
  RejectTagBody,
  TagReviewIdParam,
} from "./tagReview.schemas.js";
import { tagReviewService } from "./tagReview.service.js";

export const tagReviewController = {
  async list(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListTagReviewsQuery>(res);
    const page = await tagReviewService.listQueue(userId, query);
    sendSuccess(res, page, "Tag review queue.");
  },

  async pendingCount(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const count = await tagReviewService.countPending(userId);
    sendSuccess(res, count, "Pending tag review count.");
  },

  async metrics(_req: Request, res: Response) {
    sendSuccess(res, await tagReviewService.getMetrics(), "Tag review metrics.");
  },

  async approve(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<TagReviewIdParam>(res);
    const body = validated.body<ApproveTagBody>(res);
    await tagReviewService.approveTag(userId, id, body);
    sendSuccess(res, null, "Tag approved.");
  },

  async reject(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<TagReviewIdParam>(res);
    const body = validated.body<RejectTagBody>(res);
    await tagReviewService.rejectTag(userId, id, body);
    sendSuccess(res, null, "Tag removed.");
  },
};
