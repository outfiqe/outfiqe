import { z } from "zod";

import { CouponEligibilityScopeType, CouponStatus, CouponType } from "#generated/prisma/enums.js";

import {
  COUPON_CODE_MAX_LENGTH,
  COUPON_CODE_MIN_LENGTH,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "./coupon.constants.js";

const AMOUNT_MIN = 1;
const AMOUNT_MAX = 10_000_000;
const PERCENT_BASIS_POINTS_MAX = 100 * 100;

const couponCodeSchema = z
  .string()
  .trim()
  .min(COUPON_CODE_MIN_LENGTH)
  .max(COUPON_CODE_MAX_LENGTH)
  .transform((value) => value.toUpperCase());

export const couponEligibilityInputSchema = z.object({
  scopeType: z.enum(CouponEligibilityScopeType),
  scopeId: z.uuid(),
});

const couponAmountFieldsMatchType = (data: {
  type: CouponType;
  percentBasisPoints?: number;
  fixedAmount?: number;
}): boolean =>
  data.type === CouponType.PERCENT
    ? data.percentBasisPoints !== undefined && data.fixedAmount === undefined
    : data.fixedAmount !== undefined && data.percentBasisPoints === undefined;

const COUPON_AMOUNT_FIELD_MISMATCH_MESSAGE =
  "Provide percentBasisPoints for a PERCENT coupon or fixedAmount for a FIXED coupon, not both.";

export const createCouponSchema = z
  .object({
    code: couponCodeSchema,
    type: z.enum(CouponType),
    percentBasisPoints: z.number().int().min(1).max(PERCENT_BASIS_POINTS_MAX).optional(),
    fixedAmount: z.number().int().min(AMOUNT_MIN).max(AMOUNT_MAX).optional(),
    maxDiscountAmount: z.number().int().min(AMOUNT_MIN).max(AMOUNT_MAX).optional(),
    minSubtotal: z.number().int().min(0).default(0),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().nullable().optional(),
    totalBudgetAmount: z.number().int().min(AMOUNT_MIN).max(AMOUNT_MAX).optional(),
    maxRedemptions: z.number().int().min(1).optional(),
    firstOrderOnly: z.boolean().default(false),
    prepaidOnly: z.boolean().default(false),
    stacksWithBrandDiscount: z.boolean().default(true),
    eligibility: z.array(couponEligibilityInputSchema).default([]),
  })
  .refine(couponAmountFieldsMatchType, { message: COUPON_AMOUNT_FIELD_MISMATCH_MESSAGE })
  .refine((data) => !data.endsAt || data.endsAt > data.startsAt, {
    message: "endsAt must be after startsAt.",
    path: ["endsAt"],
  });

export const updateCouponStatusSchema = z.object({
  status: z.enum(CouponStatus),
});

export const listCouponsQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const couponIdParamSchema = z.object({ id: z.uuid() });

export const applyCartCouponSchema = z.object({ code: couponCodeSchema });

export type CreateCouponBody = z.infer<typeof createCouponSchema>;
export type UpdateCouponStatusBody = z.infer<typeof updateCouponStatusSchema>;
export type ListCouponsQuery = z.infer<typeof listCouponsQuerySchema>;
export type CouponIdParam = z.infer<typeof couponIdParamSchema>;
export type ApplyCartCouponBody = z.infer<typeof applyCartCouponSchema>;
