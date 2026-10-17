import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { OrderIdParam } from "../order.schemas.js";
import type { RefundIdParam } from "./refund.schemas.js";
import type { RefundDestinationBody } from "./refund-destination.schemas.js";
import { orderRefundDestinationService } from "./refund-destination.service.js";

export const orderRefundDestinationController = {
  async getMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { orderId } = validated.params<OrderIdParam>(res);
    const destination = await orderRefundDestinationService.getMyRefundDestination(userId, orderId);
    sendSuccess(res, destination, "Refund details.");
  },

  async saveMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { orderId } = validated.params<OrderIdParam>(res);
    const destination = await orderRefundDestinationService.saveMyRefundDestination(
      userId,
      orderId,
      validated.body<RefundDestinationBody>(res),
    );
    sendSuccess(res, destination, "Refund details saved.");
  },

  async revealAccountNumber(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { refundId } = validated.params<RefundIdParam>(res);
    const account = await orderRefundDestinationService.revealRefundAccountNumber(userId, refundId);
    sendSuccess(res, account, "Refund account number.");
  },
};
