import type { BrandTagReviewPolicy as BrandTagReviewPolicyType } from "@outfiqe/types";
import { z } from "zod";

export const BrandTagReviewPolicy = {
  OPEN: "OPEN",
  TRUSTED_ONLY: "TRUSTED_ONLY",
  APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
} as const satisfies Record<string, BrandTagReviewPolicyType>;
export type BrandTagReviewPolicyValue =
  (typeof BrandTagReviewPolicy)[keyof typeof BrandTagReviewPolicy];

export const brandProfileSchema = z.object({
  brand: z.object({
    id: z.string(),
    name: z.string(),
    contactName: z.string(),
    email: z.email(),
    phone: z.string(),
    instagram: z.string(),
    avatarUrl: z.url().nullable(),
    bannerUrl: z.url().nullable(),
    madeInNepal: z.boolean(),
    tagReviewPolicy: z.enum(BrandTagReviewPolicy),
    autoApproveVerifiedBuyers: z.boolean(),
    createdAt: z.string(),
  }),
  membershipRole: z.enum(["OWNER", "STAFF"]),
});

export type BrandProfile = z.infer<typeof brandProfileSchema>;

export const updateBrandProfileInputSchema = z
  .object({
    contactName: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(1),
    instagram: z.string().trim().min(1).max(100),
    avatarUrl: z.url().nullable(),
    avatarImageAssetId: z.uuid().nullable(),
    bannerUrl: z.url().nullable(),
    bannerImageAssetId: z.uuid().nullable(),
    tagReviewPolicy: z.enum(BrandTagReviewPolicy),
    autoApproveVerifiedBuyers: z.boolean(),
  })
  .partial();

export type UpdateBrandProfileInput = z.infer<typeof updateBrandProfileInputSchema>;
