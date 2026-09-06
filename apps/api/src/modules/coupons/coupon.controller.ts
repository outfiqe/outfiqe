import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  CouponIdParam,
  CreateCouponBody,
  ListCouponsQuery,
  PreviewBuyNowCouponBody,
  RedemptionSearchQuery,
  UpdateCouponBudgetBody,
  UpdateCouponStatusBody,
} from "./coupon.schemas.js";
import { couponService } from "./coupon.service.js";

const CREATED_STATUS = 201;

export const couponController = {
  async create(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const body = validated.body<CreateCouponBody>(res);

    const coupon = await couponService.create(userId, body);
    sendSuccess(res, coupon, "Coupon created.", CREATED_STATUS);
  },

  async list(_req: Request, res: Response) {
    const query = validated.query<ListCouponsQuery>(res);
    const page = await couponService.list(query);
    sendSuccess(res, page, "Coupons.");
  },

  async getById(_req: Request, res: Response) {
    const { id } = validated.params<CouponIdParam>(res);
    const coupon = await couponService.getById(id);
    sendSuccess(res, coupon, "Coupon.");
  },

  async updateStatus(_req: Request, res: Response) {
    const { id } = validated.params<CouponIdParam>(res);
    const body = validated.body<UpdateCouponStatusBody>(res);

    const coupon = await couponService.updateStatus(id, body);
    sendSuccess(res, coupon, "Coupon updated.");
  },

  async approve(_req: Request, res: Response) {
    const { userId: adminId } = requireAuthPrincipal(res);
    const { id } = validated.params<CouponIdParam>(res);

    const coupon = await couponService.approve(id, adminId);
    sendSuccess(res, coupon, "Coupon approved.");
  },

  async updateBudget(_req: Request, res: Response) {
    const { id } = validated.params<CouponIdParam>(res);
    const body = validated.body<UpdateCouponBudgetBody>(res);

    const coupon = await couponService.updateBudget(id, body);
    sendSuccess(res, coupon, "Coupon budget updated.");
  },

  async getPerformance(_req: Request, res: Response) {
    const { id } = validated.params<CouponIdParam>(res);
    const performance = await couponService.getPerformance(id);
    sendSuccess(res, performance, "Coupon performance.");
  },

  async searchRedemptions(_req: Request, res: Response) {
    const query = validated.query<RedemptionSearchQuery>(res);
    const page = await couponService.searchRedemptions(query);
    sendSuccess(res, page, "Coupon redemptions.");
  },

  async previewBuyNow(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const body = validated.body<PreviewBuyNowCouponBody>(res);

    const preview = await couponService.previewForBuyNow(userId, body);
    sendSuccess(res, preview, "Coupon preview.");
  },
};
