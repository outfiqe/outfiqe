import { z } from "zod";

export const CreatorLinkType = {
  INTERNAL_SINGLE_USE: "INTERNAL_SINGLE_USE",
  EXTERNAL_REUSABLE: "EXTERNAL_REUSABLE",
} as const;
export type CreatorLinkTypeValue = (typeof CreatorLinkType)[keyof typeof CreatorLinkType];

export const CreatorLinkStatus = {
  ACTIVE: "ACTIVE",
  CONSUMED: "CONSUMED",
  REVOKED: "REVOKED",
} as const;
export type CreatorLinkStatusValue = (typeof CreatorLinkStatus)[keyof typeof CreatorLinkStatus];

export const creatorLinkSchema = z.object({
  id: z.string(),
  token: z.string(),
  shareUrl: z.string(),
  type: z.enum(CreatorLinkType),
  status: z.enum(CreatorLinkStatus),
  productId: z.string().nullable(),
  productName: z.string().nullable(),
  clickCount: z.number(),
  createdAt: z.string(),
});
export type CreatorLink = z.infer<typeof creatorLinkSchema>;

export const creatorLinkPageSchema = z.object({
  items: z.array(creatorLinkSchema),
  nextCursor: z.string().nullable(),
});
export type CreatorLinkPage = z.infer<typeof creatorLinkPageSchema>;

export const recordClickResultSchema = z.object({ targetUrl: z.string() });
export type RecordClickResult = z.infer<typeof recordClickResultSchema>;
