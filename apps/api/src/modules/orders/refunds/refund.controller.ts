import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { readRequiredIdempotencyKey } from "#middlewares/require-idempotency-key.js";
import { validated } from "#middlewares/validate.js";

import type { OrderIdParam } from "../order.schemas.js";
import { orderLineCancellationService } from "./line-cancellation.service.js";
import type {
  CancelMyOrderLinesBody,
  ListRefundQueueQuery,
  MarkManualRefundPaidBody,
  RefundIdParam,
  StaffRefundItemsBody,
} from "./refund.schemas.js";
import { orderRefundService } from "./refund.service.js";

export const orderRefundController = {
  async refundItems(req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { orderId } = validated.params<OrderIdParam>(res);
    const refund = await orderRefundService.refundOrderItems(
      userId,
      orderId,
      validated.body<StaffRefundItemsBody>(res),
      readRequiredIdempotencyKey(req),
    );
    sendSuccess(res, refund, "Refund recorded.", HTTP_STATUS.CREATED);
  },

  async listForOrder(_req: Request, res: Response) {
    const { orderId } = validated.params<OrderIdParam>(res);
    const refunds = await orderRefundService.listRefundsForOrder(orderId);
    sendSuccess(res, { refunds }, "Order refunds.");
  },

  async cancelMyLines(req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { orderId } = validated.params<OrderIdParam>(res);
    const refund = await orderLineCancellationService.cancelMyOrderLines(
      userId,
      orderId,
      validated.body<CancelMyOrderLinesBody>(res),
      readRequiredIdempotencyKey(req),
    );
    sendSuccess(res, refund, "Items cancelled.", HTTP_STATUS.CREATED);
  },

  async listMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { orderId } = validated.params<OrderIdParam>(res);
    const refunds = await orderRefundService.listMyOrderRefunds(userId, orderId);
    sendSuccess(res, { refunds }, "Your refunds.");
  },

  async listQueue(_req: Request, res: Response) {
    const page = await orderRefundService.listRefundQueue(
      validated.query<ListRefundQueueQuery>(res),
    );
    sendSuccess(res, page, "Refunds.");
  },

  async markPaid(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { refundId } = validated.params<RefundIdParam>(res);
    const refund = await orderRefundService.markManualRefundPaid(
      userId,
      refundId,
      validated.body<MarkManualRefundPaidBody>(res),
    );
    sendSuccess(res, refund, "Refund marked as paid.");
  },
};
