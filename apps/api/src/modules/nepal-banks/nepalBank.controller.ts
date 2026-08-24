import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";

import { nepalBankService } from "./nepalBank.service.js";

export const nepalBankController = {
  async listActive(_req: Request, res: Response) {
    const banks = await nepalBankService.listActive();
    sendSuccess(res, banks, "Banks.");
  },
};
