import type {
  CommissionSource as CommissionSourceType,
  CommissionStatus as CommissionStatusType,
} from "@outfiqe/types";
import { z } from "zod";

export const CommissionSource = {
  TAG_CLICK: "TAG_CLICK",
  INTERNAL_LINK: "INTERNAL_LINK",
  EXTERNAL_LINK: "EXTERNAL_LINK",
} as const satisfies Record<string, CommissionSourceType>;
export type CommissionSourceValue = (typeof CommissionSource)[keyof typeof CommissionSource];

export const CommissionStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  AVAILABLE: "AVAILABLE",
  PAID: "PAID",
  VOIDED: "VOIDED",
} as const satisfies Record<string, CommissionStatusType>;
export type CommissionStatusValue = (typeof CommissionStatus)[keyof typeof CommissionStatus];

export const creatorCommissionSchema = z.object({
  id: z.string(),
  productName: z.string(),
  brandName: z.string(),
  imageUrl: z.string().nullable(),
  source: z.enum(CommissionSource),
  status: z.enum(CommissionStatus),
  amount: z.number(),
  createdAt: z.string(),
});
export type CreatorCommission = z.infer<typeof creatorCommissionSchema>;

export const earningsPageSchema = z.object({
  items: z.array(creatorCommissionSchema),
  nextCursor: z.string().nullable(),
});
export type EarningsPage = z.infer<typeof earningsPageSchema>;

export const earningsSummarySchema = z.object({
  totalEarnings: z.number(),
  pending: z.number(),
  available: z.number(),
  paid: z.number(),
});
export type EarningsSummary = z.infer<typeof earningsSummarySchema>;
