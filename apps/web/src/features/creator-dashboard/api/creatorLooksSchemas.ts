import type {
  TagRejectionReason as TagRejectionReasonType,
  TagReviewStatus as TagReviewStatusType,
} from "@outfiqe/types";
import { z } from "zod";

export const taggedProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
});

export const creatorLookSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  caption: z.string().nullable(),
  createdAt: z.string(),
  taggedProducts: z.array(taggedProductSchema),
});
export type CreatorLook = z.infer<typeof creatorLookSchema>;

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

export const editTaggedProductSchema = z.object({
  productId: z.string(),
  sizeWorn: z.string(),
  reviewStatus: z.enum(TagReviewStatus),
  rejectionReason: z.enum(TagRejectionReason).nullable(),
  rejectionNote: z.string().nullable(),
  canReRequest: z.boolean(),
  product: z.object({
    id: z.string(),
    name: z.string(),
    brand: z.string(),
    price: z.number(),
    imageUrl: z.string().nullable(),
  }),
});
export type EditTaggedProduct = z.infer<typeof editTaggedProductSchema>;

export const creatorLookEditDetailSchema = z.object({
  id: z.string(),
  imageUrls: z.array(z.string()),
  caption: z.string().nullable(),
  taggedProducts: z.array(editTaggedProductSchema),
});
export type CreatorLookEditDetail = z.infer<typeof creatorLookEditDetailSchema>;
