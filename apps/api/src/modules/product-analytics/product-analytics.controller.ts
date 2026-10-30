import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";

import type { InsightRangeQuery } from "./product-analytics.schemas.js";
import { productAnalyticsService } from "./product-analytics.service.js";

const readRange = (res: Response) => validated.query<InsightRangeQuery>(res).range;

export const productAnalyticsController = {
  async overview(_req: Request, res: Response) {
    sendSuccess(res, await productAnalyticsService.overview(readRange(res)), "Analytics overview.");
  },

  async purchaseFunnel(_req: Request, res: Response) {
    sendSuccess(
      res,
      await productAnalyticsService.purchaseFunnel(readRange(res)),
      "Purchase funnel.",
    );
  },

  async lookToOrder(_req: Request, res: Response) {
    sendSuccess(res, await productAnalyticsService.lookToOrder(readRange(res)), "Look-to-order.");
  },

  async acquisition(_req: Request, res: Response) {
    sendSuccess(res, await productAnalyticsService.acquisition(readRange(res)), "Acquisition.");
  },

  async retention(_req: Request, res: Response) {
    sendSuccess(res, await productAnalyticsService.retention(readRange(res)), "Retention.");
  },

  async zeroResultSearches(_req: Request, res: Response) {
    sendSuccess(
      res,
      await productAnalyticsService.zeroResultSearches(readRange(res)),
      "Searches with no results.",
    );
  },

  async siteTraffic(_req: Request, res: Response) {
    sendSuccess(res, await productAnalyticsService.siteTraffic(readRange(res)), "Site traffic.");
  },

  async siteSpeed(_req: Request, res: Response) {
    sendSuccess(res, await productAnalyticsService.siteSpeed(readRange(res)), "Site speed.");
  },
};
