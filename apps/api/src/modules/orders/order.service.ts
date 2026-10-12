import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { FulfilmentStatus } from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { orderCancellationService } from "./cancellation/cancellation.service.js";
import { orderCheckoutService } from "./checkout/checkout.service.js";
import { orderFulfilmentGroupRepository } from "./fulfilment-groups/fulfilment-group.repository.js";
import { orderFulfilmentGroupService } from "./fulfilment-groups/fulfilment-group.service.js";
import { FULFILMENT_ADVANCE_FROM } from "./order.constants.js";
import { orderRepository } from "./order.repository.js";
import type {
  AdvanceFulfilmentBody,
  ListAdminOrdersQuery,
  ListOrdersQuery,
} from "./order.schemas.js";
import type { OrderAdminSummaryView, OrderAdminView } from "./order.types.js";
import { type OrderSummaryView, type OrderView } from "./order.types.js";
import {
  deriveOrderFulfilment,
  toOrderAdminSummaryView,
  toOrderAdminView,
  toOrderSummaryView,
  toOrderView,
} from "./order.utils.js";
import { orderReturnService } from "./returns/return.service.js";

export const orderService = {
  async getOrder(userId: string, orderId: string): Promise<OrderView> {
    const order = await orderRepository.findByIdForUser(userId, orderId);
    if (!order) throw new AppError("NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND);
    return toOrderView(order);
  },

  async listOrders(
    userId: string,
    { cursor, limit }: ListOrdersQuery,
  ): Promise<{ orders: OrderSummaryView[]; nextCursor: string | null }> {
    const rows = await orderRepository.listForUser(userId, { cursor, limit });
    const { items: pagedOrders, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);
    return { orders: pagedOrders.map(toOrderSummaryView), nextCursor };
  },

  async listAllAdmin(
    query: ListAdminOrdersQuery,
  ): Promise<{ orders: OrderAdminSummaryView[]; nextCursor: string | null }> {
    const rows = await orderRepository.listAllAdmin(query);
    const { items: pagedOrders, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);
    return { orders: pagedOrders.map(toOrderAdminSummaryView), nextCursor };
  },

  async getOrderAdmin(orderId: string): Promise<OrderAdminView> {
    const order = await orderRepository.findByIdAdmin(orderId);
    if (!order) throw new AppError("NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND);
    return toOrderAdminView(order);
  },

  async advanceFulfilment(orderId: string, { status }: AdvanceFulfilmentBody): Promise<void> {
    const order = await orderRepository.findForAdminAction(orderId);
    if (!order) throw new AppError("NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND);

    const fromStatuses = FULFILMENT_ADVANCE_FROM[status] ?? [];
    const deliveredAt = status === FulfilmentStatus.DELIVERED ? new Date() : undefined;

    const updated = await orderRepository.updateFulfilmentStatus(
      orderId,
      fromStatuses,
      status,
      deliveredAt,
    );
    if (!updated) {
      throw new AppError(
        "INVALID_TRANSITION",
        "This order can't move to that status from where it is.",
        HTTP_STATUS.CONFLICT,
      );
    }

    await prisma.$transaction(async (tx) => {
      await orderFulfilmentGroupRepository.advanceActiveFulfilmentGroupsForOrder(
        tx,
        orderId,
        status,
        deliveredAt ?? new Date(),
      );
      const groupStatuses = await orderFulfilmentGroupRepository.listFulfilmentGroupStatuses(
        tx,
        orderId,
      );
      const rollupStatuses = groupStatuses.length > 0 ? groupStatuses : [status];
      await orderFulfilmentGroupRepository.setOrderFulfilmentRollup(
        tx,
        orderId,
        deriveOrderFulfilment(rollupStatuses),
      );
    });

    await eventBus.publish(DomainEvents.ORDER_STATUS_CHANGED, {
      orderId,
      userId: order.userId,
      status,
    });
  },

  ...orderCheckoutService,

  ...orderCancellationService,

  ...orderReturnService,

  ...orderFulfilmentGroupService,
};
