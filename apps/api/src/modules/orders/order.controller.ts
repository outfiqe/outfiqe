import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { CheckoutBody, ListOrdersQuery, OrderIdParam } from "./order.schemas.js";
import { orderService } from "./order.service.js";

const IDEMPOTENCY_HEADER = "Idempotency-Key";
const CREATED_STATUS = 201;

export const orderController = {
  async checkout(req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const body = validated.body<CheckoutBody>(res);
    const idempotencyKey = req.header(IDEMPOTENCY_HEADER);

    const order = await orderService.checkout(userId, body, idempotencyKey);
    sendSuccess(res, order, "Order placed.", CREATED_STATUS);
  },

  async get(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { orderId } = validated.params<OrderIdParam>(res);

    const order = await orderService.getOrder(userId, orderId);
    sendSuccess(res, order, "Order.");
  },

  async list(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListOrdersQuery>(res);

    const page = await orderService.listOrders(userId, query);
    sendSuccess(res, page, "Your orders.");
  },
};
