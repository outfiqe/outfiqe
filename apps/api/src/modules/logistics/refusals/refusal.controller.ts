import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  ClearRefusalsBody,
  CodEligibilityQuery,
  RefusalOrderParam,
} from "./refusal.schemas.js";
import { logisticsRefusalService } from "./refusal.service.js";

export const logisticsRefusalController = {
  async getMyCodEligibility(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const eligibility = await logisticsRefusalService.getMyCodEligibility(
      userId,
      validated.query<CodEligibilityQuery>(res),
    );
    sendSuccess(res, eligibility, "Cash on delivery.");
  },

  async getOrderCustomerRefusals(_req: Request, res: Response) {
    const { orderId } = validated.params<RefusalOrderParam>(res);
    sendSuccess(
      res,
      await logisticsRefusalService.getOrderCustomerRefusals(orderId),
      "Delivery refusals.",
    );
  },

  async clearOrderCustomerRefusals(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { orderId } = validated.params<RefusalOrderParam>(res);
    const refusals = await logisticsRefusalService.clearOrderCustomerRefusals(
      userId,
      orderId,
      validated.body<ClearRefusalsBody>(res),
    );
    sendSuccess(res, refusals, "Refusals cleared.");
  },
};
