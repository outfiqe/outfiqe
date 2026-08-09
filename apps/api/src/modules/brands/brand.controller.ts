import type { Request, Response } from "express";

import { brandService } from "./brand.service.js";

import { sendSuccess } from "#lib/api-response.utils.js";

import { getAuthPrincipal } from "../../shared/middlewares/require-auth.js";

export const brandController = {
  async me(_req: Request, res: Response) {
    const principal = getAuthPrincipal(res);
    if (!principal) throw new Error("me() reached without an auth principal");

    const profile = await brandService.getMyBrand(principal.userId);
    sendSuccess(res, profile, "Your brand.");
  },
};
