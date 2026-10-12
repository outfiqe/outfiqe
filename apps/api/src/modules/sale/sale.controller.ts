import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { validated } from "#middlewares/validate.js";

import type { ListTopSaleQuery, SaleDebugParam } from "./sale.schemas.js";
import { saleService } from "./sale.service.js";

export const saleController = {
  async listTop(_req: Request, res: Response) {
    const { limit } = validated.query<ListTopSaleQuery>(res);
    const products = await saleService.listTopSaleProducts(limit);
    sendSuccess(res, products, "Top sale products.");
  },

  async getDebugSnapshot(_req: Request, res: Response) {
    const { productId } = validated.params<SaleDebugParam>(res);

    const snapshot = await saleService.getDebugSnapshot(productId);
    if (!snapshot) {
      throw new AppError("PRODUCT_NOT_FOUND", "Product not found.", HTTP_STATUS.NOT_FOUND);
    }

    sendSuccess(res, snapshot, "Sale debug snapshot.");
  },
};
