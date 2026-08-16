import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { PaymentOrderIdParam } from "./payment.schemas.js";
import { paymentService } from "./payment.service.js";

export const paymentController = {
  async initiate(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { orderId } = validated.params<PaymentOrderIdParam>(res);

    const result = await paymentService.initiate(userId, orderId);
    sendSuccess(res, result, "Redirecting to payment.");
  },

  async verify(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { orderId } = validated.params<PaymentOrderIdParam>(res);

    const result = await paymentService.verify(userId, orderId);
    sendSuccess(res, result, "Payment status.");
  },
};
