import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { validated } from "#middlewares/validate.js";

import type { ListTopTrendingQuery, TrendDebugParam } from "./trending.schemas.js";
import { trendingService } from "./trending.service.js";

const NOT_FOUND_STATUS = 404;

export const trendingController = {
  async listTop(_req: Request, res: Response) {
    const { limit } = validated.query<ListTopTrendingQuery>(res);
    const products = await trendingService.listTopTrendingProducts(limit);
    sendSuccess(res, products, "Top trending products.");
  },

  async getDebugSnapshot(_req: Request, res: Response) {
    const { productId } = validated.params<TrendDebugParam>(res);

    const snapshot = await trendingService.getDebugSnapshot(productId);
    if (!snapshot) {
      throw new AppError("PRODUCT_NOT_FOUND", "Product not found.", NOT_FOUND_STATUS);
    }

    sendSuccess(res, snapshot, "Trend debug snapshot.");
  },
};
