import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import { TAG_REVIEW_RESPONSE_MESSAGES } from "./tag-review.constants.js";
import type {
  ApproveTagBody,
  ListMetricTagsQuery,
  ListTagReviewsQuery,
  RejectTagBody,
  TagReviewIdParam,
} from "./tag-review.schemas.js";
import { tagReviewService } from "./tag-review.service.js";

export const tagReviewController = {
  async list(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListTagReviewsQuery>(res);
    const queuePage = await tagReviewService.listQueue(userId, query);
    sendSuccess(res, queuePage, TAG_REVIEW_RESPONSE_MESSAGES.queue);
  },

  async pendingCount(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const pendingCount = await tagReviewService.countPending(userId);
    sendSuccess(res, pendingCount, TAG_REVIEW_RESPONSE_MESSAGES.pendingCount);
  },

  async metrics(_req: Request, res: Response) {
    sendSuccess(res, await tagReviewService.getMetrics(), TAG_REVIEW_RESPONSE_MESSAGES.metrics);
  },

  async metricTags(_req: Request, res: Response) {
    const query = validated.query<ListMetricTagsQuery>(res);
    const metricTagPage = await tagReviewService.listMetricTags(query);
    sendSuccess(res, metricTagPage, TAG_REVIEW_RESPONSE_MESSAGES.metricTags);
  },

  async approve(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<TagReviewIdParam>(res);
    const body = validated.body<ApproveTagBody>(res);
    await tagReviewService.approveTag(userId, id, body);
    sendSuccess(res, null, TAG_REVIEW_RESPONSE_MESSAGES.approved);
  },

  async reject(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<TagReviewIdParam>(res);
    const body = validated.body<RejectTagBody>(res);
    await tagReviewService.rejectTag(userId, id, body);
    sendSuccess(res, null, TAG_REVIEW_RESPONSE_MESSAGES.removed);
  },
};
