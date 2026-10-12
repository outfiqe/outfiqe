import { z } from "zod";

import { TagRejectionReason, TagReviewStatus } from "#generated/prisma/enums.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const REJECTION_NOTE_MAX = 280;

export const tagReviewIdParamSchema = z.object({ id: z.uuid() });

export const listTagReviewsQuerySchema = z.object({
  status: z.enum(TagReviewStatus).default(TagReviewStatus.PENDING),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const approveTagSchema = z.object({
  trustCreator: z.boolean().default(false),
});

export const rejectTagSchema = z
  .object({
    reason: z.enum(TagRejectionReason),
    note: z.string().trim().min(1).max(REJECTION_NOTE_MAX).optional(),
  })
  .refine((body) => body.reason !== TagRejectionReason.OTHER || Boolean(body.note), {
    error: "A note is required when the reason is OTHER.",
    path: ["note"],
  });

export type TagReviewIdParam = z.infer<typeof tagReviewIdParamSchema>;
export type ListTagReviewsQuery = z.infer<typeof listTagReviewsQuerySchema>;
export type ApproveTagBody = z.infer<typeof approveTagSchema>;
export type RejectTagBody = z.infer<typeof rejectTagSchema>;
