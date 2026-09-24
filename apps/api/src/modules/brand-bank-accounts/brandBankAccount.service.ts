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
import { brandRepository } from "#modules/brands/brand.repository.js";
import { nepalBankService } from "#modules/nepal-banks/nepalBank.service.js";

import { brandBankAccountRepository } from "./brandBankAccount.repository.js";
import type {
  AdminBrandBankAccountView,
  CreateBrandBankAccountResult,
  PublicBrandBankAccount,
  RevealedBrandBankAccount,
} from "./brandBankAccount.types.js";
import { toAdminBrandBankAccountView, toPublicBrandBankAccount } from "./brandBankAccount.utils.js";

const NOT_FOUND_STATUS = 404;

export const brandBankAccountService = {
  async create(brandId: string, body: BankAccountBody): Promise<CreateBrandBankAccountResult> {
    await nepalBankService.requireActiveBank(body.bankId);

    const brand = await brandRepository.findById(brandId);
    if (!brand) throw new AppError("NOT_FOUND", "Brand not found.", NOT_FOUND_STATUS);

    const bankAccount = await prisma.$transaction(async (tx) => {
      const existingCount = await brandBankAccountRepository.countForBrand(brandId, tx);
      return brandBankAccountRepository.create(
        {
          brandId,
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
      bankAccount: toPublicBrandBankAccount(bankAccount),
      nameMismatch: isNameMismatch(body.accountName, brand.contactName),
    };
  },

  async listForBrand(brandId: string): Promise<PublicBrandBankAccount[]> {
    const bankAccounts = await brandBankAccountRepository.listForBrand(brandId);
    return bankAccounts.map(toPublicBrandBankAccount);
  },

  async setDefault(brandId: string, id: string): Promise<void> {
    const updated = await brandBankAccountRepository.setDefault(brandId, id);
    if (!updated) {
      throw new AppError("NOT_FOUND", "Bank account not found.", NOT_FOUND_STATUS);
    }
  },

  async verify(id: string, adminId: string): Promise<void> {
    const account = await brandBankAccountRepository.findById(id);
    if (!account) throw new AppError("NOT_FOUND", "Bank account not found.", NOT_FOUND_STATUS);
    await brandBankAccountRepository.verify(id, adminId);
  },

  async reveal(id: string, adminId: string): Promise<RevealedBrandBankAccount> {
    const account = await brandBankAccountRepository.findById(id);
    if (!account) throw new AppError("NOT_FOUND", "Bank account not found.", NOT_FOUND_STATUS);

    await brandBankAccountRepository.createAccessLog(id, adminId);
    return { accountNumber: decryptAccountNumber(account.accountNumberCiphertext) };
  },

  async listAllAdmin(
    query: ListAdminBankAccountsQuery,
  ): Promise<{ items: AdminBrandBankAccountView[]; nextCursor: string | null }> {
    const rows = await brandBankAccountRepository.listAllAdmin(query);
    const { items: pagedRows, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);

    return { items: pagedRows.map(toAdminBrandBankAccountView), nextCursor };
  },
};
