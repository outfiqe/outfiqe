import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import type { BankAccountBody, BankAccountIdParam } from "#lib/bank-account-body.schemas.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import { bankAccountService } from "./bankAccount.service.js";

const CREATED_STATUS = 201;

export const bankAccountController = {
  async create(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const body = validated.body<BankAccountBody>(res);
    const result = await bankAccountService.create(userId, body);
    sendSuccess(res, result, "Bank account added.", CREATED_STATUS);
  },

  async list(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const bankAccounts = await bankAccountService.listForUser(userId);
    sendSuccess(res, bankAccounts, "Bank accounts.");
  },

  async setDefault(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<BankAccountIdParam>(res);
    await bankAccountService.setDefault(userId, id);
    sendSuccess(res, null, "Default bank account updated.");
  },

  async verify(_req: Request, res: Response) {
    const { userId: adminId } = requireAuthPrincipal(res);
    const { id } = validated.params<BankAccountIdParam>(res);
    await bankAccountService.verify(id, adminId);
    sendSuccess(res, null, "Bank account verified.");
  },

  async reveal(_req: Request, res: Response) {
    const { userId: adminId } = requireAuthPrincipal(res);
    const { id } = validated.params<BankAccountIdParam>(res);
    const revealed = await bankAccountService.reveal(id, adminId);
    sendSuccess(res, revealed, "Bank account number revealed.");
  },
};
