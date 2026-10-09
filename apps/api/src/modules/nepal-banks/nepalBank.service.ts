import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

import { nepalBankRepository } from "./nepalBank.repository.js";
import type { NepalBankRecord, PublicNepalBank } from "./nepalBank.types.js";
import { toPublicNepalBank } from "./nepalBank.utils.js";

export const nepalBankService = {
  async listActive(): Promise<PublicNepalBank[]> {
    const banks = await nepalBankRepository.listActive();
    return banks.map(toPublicNepalBank);
  },

  async requireActiveBank(bankId: string): Promise<NepalBankRecord> {
    const bank = await nepalBankRepository.findById(bankId);
    if (!bank || !bank.isActive) {
      throw new AppError(
        "BANK_NOT_FOUND",
        "This bank isn't available for selection.",
        HTTP_STATUS.NOT_FOUND,
      );
    }
    return bank;
  },
};
