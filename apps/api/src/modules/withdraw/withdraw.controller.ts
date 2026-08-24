import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  ApproveWithdrawRequestBody,
  CreateWithdrawRequestBody,
  ListAdminWithdrawRequestsQuery,
  ListWithdrawRequestsQuery,
  MarkWithdrawRequestPaidBody,
  OwnerTypeQuery,
  RejectWithdrawRequestBody,
  UpdateWithdrawPolicyBody,
  WithdrawRequestIdParam,
} from "./withdraw.schemas.js";
import { withdrawService } from "./withdraw.service.js";

const CREATED_STATUS = 201;

export const withdrawController = {
  async getPolicy(_req: Request, res: Response) {
    const { ownerType } = validated.query<OwnerTypeQuery>(res);
    const policy = await withdrawService.getPolicy(ownerType);
    sendSuccess(res, policy, "Withdraw policy.");
  },

  async getEligibility(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { ownerType } = validated.query<OwnerTypeQuery>(res);
    const eligibility = await withdrawService.getEligibility(userId, ownerType);
    sendSuccess(res, eligibility, "Withdraw eligibility.");
  },

  async createRequest(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const body = validated.body<CreateWithdrawRequestBody>(res);
    const request = await withdrawService.createRequest(userId, body);
    sendSuccess(res, request, "Withdrawal request submitted.", CREATED_STATUS);
  },

  async listMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListWithdrawRequestsQuery>(res);
    const page = await withdrawService.listMine(userId, query);
    sendSuccess(res, page, "Withdrawal requests.");
  },

  async listAllAdmin(_req: Request, res: Response) {
    const query = validated.query<ListAdminWithdrawRequestsQuery>(res);
    const page = await withdrawService.listAllAdmin(query);
    sendSuccess(res, page, "Withdrawal requests.");
  },

  async approve(_req: Request, res: Response) {
    const { userId: adminId } = requireAuthPrincipal(res);
    const { id } = validated.params<WithdrawRequestIdParam>(res);
    const body = validated.body<ApproveWithdrawRequestBody>(res);
    await withdrawService.approve(id, adminId, body);
    sendSuccess(res, null, "Withdrawal request approved.");
  },

  async reject(_req: Request, res: Response) {
    const { userId: adminId } = requireAuthPrincipal(res);
    const { id } = validated.params<WithdrawRequestIdParam>(res);
    const { reason } = validated.body<RejectWithdrawRequestBody>(res);
    await withdrawService.reject(id, adminId, reason);
    sendSuccess(res, null, "Withdrawal request rejected.");
  },

  async markPaid(_req: Request, res: Response) {
    const { userId: adminId } = requireAuthPrincipal(res);
    const { id } = validated.params<WithdrawRequestIdParam>(res);
    const { referenceNote } = validated.body<MarkWithdrawRequestPaidBody>(res);
    await withdrawService.markPaid(id, adminId, referenceNote);
    sendSuccess(res, null, "Withdrawal request marked paid.");
  },

  async updatePolicy(_req: Request, res: Response) {
    const { userId: adminId } = requireAuthPrincipal(res);
    const body = validated.body<UpdateWithdrawPolicyBody>(res);
    const policy = await withdrawService.updatePolicy(body, adminId);
    sendSuccess(res, policy, "Withdraw policy updated.");
  },
};
