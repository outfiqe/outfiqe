import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  CommissionIdParam,
  CommissionTierIdParam,
  CreateCommissionTierBody,
  ListAdminCommissionsQuery,
  ListEarningsQuery,
  UpdateCommissionTierBody,
  VoidCommissionBody,
} from "./commission.schemas.js";
import { commissionService } from "./commission.service.js";

const CREATED_STATUS = 201;

export const commissionController = {
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

  async listTiers(_req: Request, res: Response) {
    const tiers = await commissionService.listTiers();
    sendSuccess(res, tiers, "Commission tiers.");
  },

  async createTier(_req: Request, res: Response) {
    const body = validated.body<CreateCommissionTierBody>(res);
    const tier = await commissionService.createTier(body);
    sendSuccess(res, tier, "Commission tier created.", CREATED_STATUS);
  },

  async updateTier(_req: Request, res: Response) {
    const { id } = validated.params<CommissionTierIdParam>(res);
    const body = validated.body<UpdateCommissionTierBody>(res);
    const tier = await commissionService.updateTier(id, body);
    sendSuccess(res, tier, "Commission tier updated.");
  },

  async deleteTier(_req: Request, res: Response) {
    const { id } = validated.params<CommissionTierIdParam>(res);
    await commissionService.deleteTier(id);
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
