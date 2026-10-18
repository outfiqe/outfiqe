import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { BrandReturnIdParam, ListBrandReturnsQuery } from "./brand-return.schemas.js";
import { logisticsBrandReturnService } from "./brand-return.service.js";

export const logisticsBrandReturnController = {
  async listMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const page = await logisticsBrandReturnService.listMyBrandReturns(
      userId,
      validated.query<ListBrandReturnsQuery>(res),
    );
    sendSuccess(res, page, "Your returns.");
  },

  async confirmMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { brandReturnId } = validated.params<BrandReturnIdParam>(res);
    const brandReturn = await logisticsBrandReturnService.confirmMyBrandReturn(
      userId,
      brandReturnId,
    );
    sendSuccess(res, brandReturn, "Return confirmed.");
  },
};
