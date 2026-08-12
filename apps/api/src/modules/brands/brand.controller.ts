import type { Request, Response } from "express";

import { brandService } from "./brand.service.js";
import { productService } from "../products/product.service.js";

import { sendSuccess } from "#lib/api-response.utils.js";

import { getAuthPrincipal } from "../../shared/middlewares/require-auth.js";
import { validated } from "../../shared/middlewares/validate.js";

import type { BrandIdParam, UpdateBrandProfileBody } from "./brand.schemas.js";
import type { ListBrandProductsQuery } from "../products/product.schemas.js";

export const brandController = {
  async me(_req: Request, res: Response) {
    const principal = getAuthPrincipal(res);
    if (!principal) throw new Error("me() reached without an auth principal");

    const profile = await brandService.getMyBrand(principal.userId);
    sendSuccess(res, profile, "Your brand.");
  },

  async updateMe(_req: Request, res: Response) {
    const principal = getAuthPrincipal(res);
    if (!principal) throw new Error("updateMe() reached without an auth principal");

    const body = validated.body<UpdateBrandProfileBody>(res);
    const profile = await brandService.updateMyBrand(principal.userId, body);
    sendSuccess(res, profile, "Brand profile updated.");
  },

  async getPublicById(_req: Request, res: Response) {
    const { id } = validated.params<BrandIdParam>(res);
    const principal = getAuthPrincipal(res);

    const profile = await brandService.getPublicProfile(id, principal?.userId);
    sendSuccess(res, profile, "Brand.");
  },

  async listProducts(_req: Request, res: Response) {
    const { id } = validated.params<BrandIdParam>(res);
    const query = validated.query<ListBrandProductsQuery>(res);

    const page = await productService.listPublicByBrand(id, query);
    sendSuccess(res, page, "Brand products.");
  },
};
