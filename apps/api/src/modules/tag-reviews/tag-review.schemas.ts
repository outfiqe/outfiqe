import { z } from "zod";

import { TagRejectionReason, TagReviewStatus } from "#generated/prisma/enums.js";

const MIN_PAGE_SIZE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MIN_CURSOR_LENGTH = 1;
const MIN_REJECTION_NOTE_LENGTH = 1;
const REJECTION_NOTE_MAX = 280;
const DEFAULT_TRUST_CREATOR = false;
const REJECTION_NOTE_REQUIRED_MESSAGE = "A note is required when the reason is OTHER.";
const REJECTION_NOTE_FIELD = "note";

export const tagReviewIdParamSchema = z.object({ id: z.uuid() });

export const listTagReviewsQuerySchema = z.object({
  status: z.enum(TagReviewStatus).default(TagReviewStatus.PENDING),
  cursor: z.string().min(MIN_CURSOR_LENGTH).optional(),
  limit: z.coerce.number().int().min(MIN_PAGE_SIZE).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const approveTagSchema = z.object({
  trustCreator: z.boolean().default(DEFAULT_TRUST_CREATOR),
});

export const rejectTagSchema = z
  .object({
    reason: z.enum(TagRejectionReason),
    note: z.string().trim().min(MIN_REJECTION_NOTE_LENGTH).max(REJECTION_NOTE_MAX).optional(),
  })
  .refine((body) => body.reason !== TagRejectionReason.OTHER || Boolean(body.note), {
    error: REJECTION_NOTE_REQUIRED_MESSAGE,
    path: [REJECTION_NOTE_FIELD],
  });

export type TagReviewIdParam = z.infer<typeof tagReviewIdParamSchema>;
export type ListTagReviewsQuery = z.infer<typeof listTagReviewsQuerySchema>;
export type ApproveTagBody = z.infer<typeof approveTagSchema>;
export type RejectTagBody = z.infer<typeof rejectTagSchema>;
