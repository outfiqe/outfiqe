import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  AdvanceFulfilmentBody,
  CancelMyOrderBody,
  CancelOrderBody,
  CheckoutBody,
  ListAdminOrdersQuery,
  ListBrandOrdersQuery,
  ListOrdersQuery,
  OrderIdParam,
} from "./order.schemas.js";
import { orderService } from "./order.service.js";

const IDEMPOTENCY_HEADER = "Idempotency-Key";
const CREATED_STATUS = 201;
const BUYER_CANCEL_DEFAULT_REASON = "Cancelled by buyer";

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

  async listAllAdmin(_req: Request, res: Response) {
    const query = validated.query<ListAdminOrdersQuery>(res);
    const page = await orderService.listAllAdmin(query);
    sendSuccess(res, page, "Orders.");
  },

  async getAdmin(_req: Request, res: Response) {
    const { orderId } = validated.params<OrderIdParam>(res);
    const order = await orderService.getOrderAdmin(orderId);
    sendSuccess(res, order, "Order.");
  },

  async advanceFulfilment(_req: Request, res: Response) {
    const { orderId } = validated.params<OrderIdParam>(res);
    const body = validated.body<AdvanceFulfilmentBody>(res);
    await orderService.advanceFulfilment(orderId, body);
    sendSuccess(res, null, "Order updated.");
  },

  async cancel(_req: Request, res: Response) {
    const { orderId } = validated.params<OrderIdParam>(res);
    const { reason } = validated.body<CancelOrderBody>(res);
    const { userId } = requireAuthPrincipal(res);

    await orderService.cancel(orderId, { type: "ADMIN", adminUserId: userId }, reason);
    sendSuccess(res, null, "Order cancelled.");
  },

  async cancelMine(_req: Request, res: Response) {
    const { orderId } = validated.params<OrderIdParam>(res);
    const { reason } = validated.body<CancelMyOrderBody>(res);
    const { userId } = requireAuthPrincipal(res);

    await orderService.cancel(
      orderId,
      { type: "BUYER", userId },
      reason ?? BUYER_CANCEL_DEFAULT_REASON,
    );
    sendSuccess(res, null, "Order cancelled.");
  },

  async listMineAsBrand(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListBrandOrdersQuery>(res);

    const page = await orderService.listMineAsBrand(userId, query);
    sendSuccess(res, page, "Your brand's orders.");
  },
};
