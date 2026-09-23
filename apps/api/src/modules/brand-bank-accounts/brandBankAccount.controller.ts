import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import type {
  BankAccountBody,
  BankAccountIdParam,
  ListAdminBankAccountsQuery,
} from "#lib/bank-account-body.schemas.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import { brandBankAccountService } from "./brandBankAccount.service.js";

const CREATED_STATUS = 201;

export const brandBankAccountController = {
  async create(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const brandId = await requireBrandId(userId);
    const body = validated.body<BankAccountBody>(res);
    const result = await brandBankAccountService.create(brandId, body);
    sendSuccess(res, result, "Bank account added.", CREATED_STATUS);
  },

  async list(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const brandId = await requireBrandId(userId);
    const bankAccounts = await brandBankAccountService.listForBrand(brandId);
    sendSuccess(res, bankAccounts, "Bank accounts.");
  },

  async setDefault(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const brandId = await requireBrandId(userId);
    const { id } = validated.params<BankAccountIdParam>(res);
    await brandBankAccountService.setDefault(brandId, id);
    sendSuccess(res, null, "Default bank account updated.");
  },

  async verify(_req: Request, res: Response) {
    const { userId: adminId } = requireAuthPrincipal(res);
    const { id } = validated.params<BankAccountIdParam>(res);
    await brandBankAccountService.verify(id, adminId);
    sendSuccess(res, null, "Bank account verified.");
  },

  async reveal(_req: Request, res: Response) {
    const { userId: adminId } = requireAuthPrincipal(res);
    const { id } = validated.params<BankAccountIdParam>(res);
    const revealed = await brandBankAccountService.reveal(id, adminId);
    sendSuccess(res, revealed, "Bank account number revealed.");
  },

  async listAllAdmin(_req: Request, res: Response) {
    const query = validated.query<ListAdminBankAccountsQuery>(res);
    const page = await brandBankAccountService.listAllAdmin(query);
    sendSuccess(res, page, "Bank accounts.");
  },
};
