import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { ListBrandIncidentsQuery } from "./reliability.schemas.js";
import { logisticsReliabilityService } from "./reliability.service.js";

export const logisticsReliabilityController = {
  async getMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const reliability = await logisticsReliabilityService.getMyBrandReliability(
      userId,
      validated.query<ListBrandIncidentsQuery>(res),
    );
    sendSuccess(res, reliability, "Your delivery reliability.");
  },

  async listBrandsToWatch(_req: Request, res: Response) {
    const brands = await logisticsReliabilityService.listBrandsToWatch();
    sendSuccess(res, { brands }, "Brands to watch.");
  },
};
