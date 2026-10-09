import { withdrawRequestService } from "./requests/request.service.js";
import { withdrawReviewService } from "./review/review.service.js";
import { withdrawRepository } from "./withdraw.repository.js";
import type { UpdateWithdrawPolicyBody } from "./withdraw.schemas.js";
import type { OwnerContext, WithdrawPolicyView } from "./withdraw.types.js";
import { toWithdrawPolicyView } from "./withdraw.utils.js";
import { computeWithdrawWindow } from "./withdraw.window.utils.js";

export const withdrawService = {
  async getPolicy(ownerType: OwnerContext["ownerType"]): Promise<WithdrawPolicyView> {
    const policy = await withdrawRepository.getOrCreateActivePolicy(ownerType);
    const window = computeWithdrawWindow(policy);
    return toWithdrawPolicyView(policy, window);
  },

  async updatePolicy(body: UpdateWithdrawPolicyBody, adminId: string): Promise<WithdrawPolicyView> {
    const { ownerType, ...fields } = body;
    const policy = await withdrawRepository.createActiveVersion(ownerType, fields, adminId);
    const window = computeWithdrawWindow(policy);
    return toWithdrawPolicyView(policy, window);
  },

  ...withdrawRequestService,

  ...withdrawReviewService,
};
