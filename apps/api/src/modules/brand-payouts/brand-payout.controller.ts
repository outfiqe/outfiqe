import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  CreateBrandCommissionExemptionBody,
  CreateGatewayFeeRateBody,
  CreatePlatformCommissionRuleBody,
  ExemptionIdParam,
  ListBrandCommissionExemptionsQuery,
  ListBrandPayoutsQuery,
} from "./brand-payout.schemas.js";
import { brandPayoutService } from "./brand-payout.service.js";

export const brandPayoutController = {
  async getMySummary(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const brandId = await requireBrandId(userId);
    const summary = await brandPayoutService.getSummary(brandId);
    sendSuccess(res, summary, "Brand payout summary.");
  },

  async listMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const brandId = await requireBrandId(userId);
    const query = validated.query<ListBrandPayoutsQuery>(res);
    const page = await brandPayoutService.listForBrand(brandId, query);
    sendSuccess(res, page, "Brand payout ledger.");
  },

  async listRules(_req: Request, res: Response) {
    const rules = await brandPayoutService.listRules();
    sendSuccess(res, rules, "Platform commission rules.");
  },

  async createRule(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const body = validated.body<CreatePlatformCommissionRuleBody>(res);
    const rule = await brandPayoutService.createRule(body, userId);
    sendSuccess(res, rule, "Platform commission rate updated.", HTTP_STATUS.CREATED);
  },

  async listGatewayFeeRates(_req: Request, res: Response) {
    const rates = await brandPayoutService.listGatewayFeeRates();
    sendSuccess(res, rates, "Gateway fee rates.");
  },

  async createGatewayFeeRate(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const body = validated.body<CreateGatewayFeeRateBody>(res);
    const rate = await brandPayoutService.createGatewayFeeRate(body, userId);
    sendSuccess(res, rate, "Gateway fee rate updated.", HTTP_STATUS.CREATED);
  },

  async listExemptions(_req: Request, res: Response) {
    const { brandId } = validated.query<ListBrandCommissionExemptionsQuery>(res);
    const exemptions = await brandPayoutService.listExemptions(brandId);
    sendSuccess(res, exemptions, "Brand commission exemptions.");
  },

  async createExemption(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const body = validated.body<CreateBrandCommissionExemptionBody>(res);
    const exemption = await brandPayoutService.createExemption(body, userId);
    sendSuccess(res, exemption, "Brand commission exemption created.", HTTP_STATUS.CREATED);
  },

  async revokeExemption(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<ExemptionIdParam>(res);
    await brandPayoutService.revokeExemption(id, userId);
    sendSuccess(res, null, "Brand commission exemption revoked.");
  },
};
