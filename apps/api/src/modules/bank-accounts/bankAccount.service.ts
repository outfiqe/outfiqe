import { prisma } from "#db/prisma.js";
import {
  decryptAccountNumber,
  encryptAccountNumber,
  lastFourDigits,
} from "#lib/account-number-encryption.utils.js";
import type {
  BankAccountBody,
  ListAdminBankAccountsQuery,
} from "#lib/bank-account-body.schemas.js";
import { isNameMismatch } from "#lib/name-mismatch.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { nepalBankService } from "#modules/nepal-banks/nepalBank.service.js";
import { userRepository } from "#modules/users/user.repository.js";

import { bankAccountRepository } from "./bankAccount.repository.js";
import type {
  AdminBankAccountView,
  CreateBankAccountResult,
  PublicBankAccount,
  RevealedBankAccount,
} from "./bankAccount.types.js";
import { toAdminBankAccountView, toPublicBankAccount } from "./bankAccount.utils.js";

const NOT_FOUND_STATUS = 404;

export const bankAccountService = {
  async create(userId: string, body: BankAccountBody): Promise<CreateBankAccountResult> {
    await nepalBankService.requireActiveBank(body.bankId);

    const user = await userRepository.findById(userId);
    if (!user) throw new AppError("NOT_FOUND", "Account not found.", NOT_FOUND_STATUS);

    const bankAccount = await prisma.$transaction(async (tx) => {
      const existingCount = await bankAccountRepository.countForUser(userId, tx);
      return bankAccountRepository.create(
        {
          userId,
          bankId: body.bankId,
          accountName: body.accountName,
          accountNumberCiphertext: encryptAccountNumber(body.accountNumber),
          accountNumberLast4: lastFourDigits(body.accountNumber),
          branchName: body.branchName,
          qrCodeImageUrl: body.qrCodeImageUrl,
          isDefault: existingCount === 0,
        },
        tx,
      );
    });

    return {
      bankAccount: toPublicBankAccount(bankAccount),
      nameMismatch: isNameMismatch(body.accountName, user.name),
    };
  },

  async listForUser(userId: string): Promise<PublicBankAccount[]> {
    const bankAccounts = await bankAccountRepository.listForUser(userId);
    return bankAccounts.map(toPublicBankAccount);
  },

  async setDefault(userId: string, id: string): Promise<void> {
    const updated = await bankAccountRepository.setDefault(userId, id);
    if (!updated) {
      throw new AppError("NOT_FOUND", "Bank account not found.", NOT_FOUND_STATUS);
    }
  },

  async verify(id: string, adminId: string): Promise<void> {
    const account = await bankAccountRepository.findById(id);
    if (!account) throw new AppError("NOT_FOUND", "Bank account not found.", NOT_FOUND_STATUS);
    await bankAccountRepository.verify(id, adminId);
  },

  async reveal(id: string, adminId: string): Promise<RevealedBankAccount> {
    const account = await bankAccountRepository.findById(id);
    if (!account) throw new AppError("NOT_FOUND", "Bank account not found.", NOT_FOUND_STATUS);

    await bankAccountRepository.createAccessLog(id, adminId);
    return { accountNumber: decryptAccountNumber(account.accountNumberCiphertext) };
  },

  async listAllAdmin(
    query: ListAdminBankAccountsQuery,
  ): Promise<{ items: AdminBankAccountView[]; nextCursor: string | null }> {
    const rows = await bankAccountRepository.listAllAdmin(query);
    const { items: pagedRows, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);

    return { items: pagedRows.map(toAdminBankAccountView), nextCursor };
  },
};
