import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  CommissionIdParam,
  CommissionScopeQuery,
  CommissionTierIdParam,
  CreateCommissionTierBody,
  ListAdminCommissionsQuery,
  ListCommissionTierHistoryQuery,
  ListEarningsQuery,
  TestCommissionTierPriceQuery,
  UpdateCommissionTierBody,
  VoidCommissionBody,
} from "./commission.schemas.js";
import { commissionService } from "./commission.service.js";

const CREATED_STATUS = 201;

export const commissionController = {
  async getMyEligibility(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const eligibility = await commissionService.getEarnerEligibility(userId);
    sendSuccess(res, eligibility, "Whether you can earn commission.");
  },

  async getMySummary(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const summary = await commissionService.getEarningsSummary(userId);
    sendSuccess(res, summary, "Your earnings.");
  },

  async listMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListEarningsQuery>(res);

    const page = await commissionService.listEarnings(userId, query);
    sendSuccess(res, page, "Your earnings ledger.");
  },

  async getBrandBuildSummary(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const summary = await commissionService.getBrandBuildEarningsSummary(userId);
    sendSuccess(res, summary, "Your brand's build earnings.");
  },

  async listBrandBuildEarnings(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListEarningsQuery>(res);

    const page = await commissionService.listBrandBuildEarnings(userId, query);
    sendSuccess(res, page, "Your brand's build earnings ledger.");
  },

  async listTiers(_req: Request, res: Response) {
    const { scope } = validated.query<CommissionScopeQuery>(res);
    const tiers = await commissionService.listTiers(scope);
    sendSuccess(res, tiers, "Commission tiers.");
  },

  async testTierPrice(_req: Request, res: Response) {
    const { scope, price } = validated.query<TestCommissionTierPriceQuery>(res);
    const priceTest = await commissionService.testTierPrice(scope, price);
    sendSuccess(res, priceTest, "Commission for this price.");
  },

  async listTierHistory(_req: Request, res: Response) {
    const query = validated.query<ListCommissionTierHistoryQuery>(res);
    const page = await commissionService.listTierHistory(query);
    sendSuccess(res, page, "Commission tier changes.");
  },

  async createTier(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { scope } = validated.query<CommissionScopeQuery>(res);
    const body = validated.body<CreateCommissionTierBody>(res);
    const tier = await commissionService.createTier(body, scope, userId);
    sendSuccess(res, tier, "Commission tier created.", CREATED_STATUS);
  },

  async updateTier(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<CommissionTierIdParam>(res);
    const { scope } = validated.query<CommissionScopeQuery>(res);
    const body = validated.body<UpdateCommissionTierBody>(res);
    const tier = await commissionService.updateTier(id, scope, body, userId);
    sendSuccess(res, tier, "Commission tier updated.");
  },

  async deleteTier(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<CommissionTierIdParam>(res);
    const { scope } = validated.query<CommissionScopeQuery>(res);
    await commissionService.deleteTier(id, scope, userId);
    sendSuccess(res, null, "Commission tier deleted.");
  },

  async listAll(_req: Request, res: Response) {
    const query = validated.query<ListAdminCommissionsQuery>(res);
    const page = await commissionService.listAll(query);
    sendSuccess(res, page, "Commissions.");
  },

  async approve(_req: Request, res: Response) {
    const { id } = validated.params<CommissionIdParam>(res);
    const { userId } = requireAuthPrincipal(res);
    await commissionService.approve(id, userId);
    sendSuccess(res, null, "Commission approved.");
  },

  async void(_req: Request, res: Response) {
    const { id } = validated.params<CommissionIdParam>(res);
    const { reason } = validated.body<VoidCommissionBody>(res);
    const { userId } = requireAuthPrincipal(res);
    await commissionService.void(id, reason, userId);
    sendSuccess(res, null, "Commission voided.");
  },

  async markPaid(_req: Request, res: Response) {
    const { id } = validated.params<CommissionIdParam>(res);
    const { userId } = requireAuthPrincipal(res);
    await commissionService.markPaid(id, userId);
    sendSuccess(res, null, "Commission marked paid.");
  },
};
