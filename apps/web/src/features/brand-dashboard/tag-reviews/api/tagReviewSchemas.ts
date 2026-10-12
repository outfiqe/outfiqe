import type {
  BrandTagReviewPolicy as BrandTagReviewPolicyType,
  TagApprovalSource as TagApprovalSourceType,
  TagRejectionReason as TagRejectionReasonType,
  TagReviewStatus as TagReviewStatusType,
} from "@outfiqe/types";
import { z } from "zod";

export const TagReviewStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const satisfies Record<string, TagReviewStatusType>;
export type TagReviewStatusValue = (typeof TagReviewStatus)[keyof typeof TagReviewStatus];

export const TagRejectionReason = {
  NOT_OUR_PRODUCT: "NOT_OUR_PRODUCT",
  COUNTERFEIT_SUSPECTED: "COUNTERFEIT_SUSPECTED",
  MISREPRESENTS_PRODUCT: "MISREPRESENTS_PRODUCT",
  POLICY_VIOLATION: "POLICY_VIOLATION",
  OTHER: "OTHER",
} as const satisfies Record<string, TagRejectionReasonType>;
export type TagRejectionReasonValue = (typeof TagRejectionReason)[keyof typeof TagRejectionReason];

export const BrandTagReviewPolicy = {
  OPEN: "OPEN",
  TRUSTED_ONLY: "TRUSTED_ONLY",
  APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
} as const satisfies Record<string, BrandTagReviewPolicyType>;
export type BrandTagReviewPolicyValue =
  (typeof BrandTagReviewPolicy)[keyof typeof BrandTagReviewPolicy];

const TagApprovalSource = {
  BRAND: "BRAND",
  POLICY_OPEN: "POLICY_OPEN",
  TRUSTED_CREATOR: "TRUSTED_CREATOR",
  VERIFIED_BUYER: "VERIFIED_BUYER",
  SLA: "SLA",
  GRANDFATHERED: "GRANDFATHERED",
} as const satisfies Record<string, TagApprovalSourceType>;

const REJECTION_NOTE_MAX = 280;

export const tagReviewQueueItemSchema = z.object({
  id: z.string(),
  lookId: z.string(),
  lookImageUrl: z.string(),
  submittedAt: z.string(),
  reviewedAt: z.string().nullable(),
  reviewStatus: z.enum(TagReviewStatus),
  approvalSource: z.enum(TagApprovalSource).nullable(),
  rejectionReason: z.enum(TagRejectionReason).nullable(),
  rejectionNote: z.string().nullable(),
  reRequestCount: z.number(),
  sizeWorn: z.string().nullable(),
  isVerifiedBuyer: z.boolean(),
  isTrustedCreator: z.boolean(),
  creator: z.object({ id: z.string(), name: z.string(), handle: z.string() }),
  product: z.object({
    id: z.string(),
    name: z.string(),
    imageUrl: z.string().nullable(),
    brandId: z.string(),
  }),
});
export type TagReviewQueueItem = z.infer<typeof tagReviewQueueItemSchema>;

export const tagReviewQueuePageSchema = z.object({
  items: z.array(tagReviewQueueItemSchema),
  nextCursor: z.string().nullable(),
});
export type TagReviewQueuePage = z.infer<typeof tagReviewQueuePageSchema>;

export const tagReviewPendingCountSchema = z.object({ pendingCount: z.number() });

export const rejectTagInputSchema = z
  .object({
    reason: z.enum(TagRejectionReason),
    note: z.string().trim().max(REJECTION_NOTE_MAX).optional(),
  })
  .refine((body) => body.reason !== TagRejectionReason.OTHER || Boolean(body.note?.length), {
    error: "Add a note explaining why.",
    path: ["note"],
  });
export type RejectTagInput = z.infer<typeof rejectTagInputSchema>;
