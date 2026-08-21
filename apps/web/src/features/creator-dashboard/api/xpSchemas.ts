import type { XpActivityType as XpActivityTypeType } from "@outfiqe/types";
import { z } from "zod";

export const XpActivityType = {
  LOOK_CREATED: "LOOK_CREATED",
  LOOK_LIKE_RECEIVED: "LOOK_LIKE_RECEIVED",
  LOOK_COMMENT_RECEIVED: "LOOK_COMMENT_RECEIVED",
  LOOK_COMMENTED: "LOOK_COMMENTED",
  LOOK_SAVED: "LOOK_SAVED",
  USER_FOLLOWED: "USER_FOLLOWED",
  PRODUCT_PURCHASED: "PRODUCT_PURCHASED",
  SALE_GENERATED: "SALE_GENERATED",
  PRODUCT_TAGGED: "PRODUCT_TAGGED",
  FOLLOWER_MILESTONE: "FOLLOWER_MILESTONE",
  ACHIEVEMENT_UNLOCKED: "ACHIEVEMENT_UNLOCKED",
  ADMIN_ADJUSTMENT: "ADMIN_ADJUSTMENT",
} as const satisfies Record<string, XpActivityTypeType>;
export type XpActivityTypeValue = (typeof XpActivityType)[keyof typeof XpActivityType];

export const levelSchema = z.object({
  id: z.string(),
  level: z.number(),
  name: z.string(),
  requiredXp: z.number(),
  icon: z.string().nullable(),
});
export type Level = z.infer<typeof levelSchema>;

export const xpProgressSchema = z.object({
  totalXp: z.number(),
  level: levelSchema,
  nextLevel: levelSchema.nullable(),
  xpToNextLevel: z.number().nullable(),
});
export type XpProgress = z.infer<typeof xpProgressSchema>;

export const xpTransactionSchema = z.object({
  id: z.string(),
  activityType: z.enum(XpActivityType),
  amount: z.number(),
  source: z.string(),
  createdAt: z.string(),
});
export type XpTransaction = z.infer<typeof xpTransactionSchema>;

export const xpTransactionPageSchema = z.object({
  items: z.array(xpTransactionSchema),
  nextCursor: z.string().nullable(),
});
export type XpTransactionPage = z.infer<typeof xpTransactionPageSchema>;
