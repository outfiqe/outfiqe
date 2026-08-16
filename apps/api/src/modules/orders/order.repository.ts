import { prisma } from "#db/prisma.js";
import {
  FulfilmentStatus,
  PaymentStatus,
  PaymentTransactionType,
} from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import type { CreateOrderInput } from "./order.types.js";

const withOrderItemDetails = {
  product: { select: { name: true, imageUrl: true, brand: { select: { name: true } } } },
  size: { select: { label: true } },
  attributedCreator: { select: { name: true } },
};

export const orderRepository = {
  async create(client: DbClient, input: CreateOrderInput) {
    const { items, paymentTransactionStatus, paymentMethod, ...orderFields } = input;
    return client.order.create({
      data: {
        ...orderFields,
        paymentMethod,
        items: { create: items },
        transactions: {
          create: [
            {
              provider: paymentMethod,
              type: PaymentTransactionType.PAYMENT,
              status: paymentTransactionStatus,
            },
          ],
        },
      },
      include: { items: { include: withOrderItemDetails } },
    });
  },

  async findByIdForUser(userId: string, orderId: string) {
    return prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: { include: withOrderItemDetails },
        transactions: { orderBy: { createdAt: "asc" } },
      },
    });
  },

  async listForUser(userId: string, params: { cursor?: string; limit: number }) {
    return prisma.order.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: { items: { include: withOrderItemDetails, take: 1, orderBy: { createdAt: "asc" } } },
    });
  },

  async listAllAdmin(params: { status?: FulfilmentStatus; cursor?: string; limit: number }) {
    return prisma.order.findMany({
      where: params.status ? { fulfilmentStatus: params.status } : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        items: { include: withOrderItemDetails, take: 1, orderBy: { createdAt: "asc" } },
        user: { select: { name: true, email: true } },
      },
    });
  },

  async findByIdAdmin(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: withOrderItemDetails },
        transactions: { orderBy: { createdAt: "asc" } },
        user: { select: { name: true, email: true } },
      },
    });
  },

  async findForAdminAction(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        phone: true,
        total: true,
        paymentMethod: true,
        paymentStatus: true,
        fulfilmentStatus: true,
        items: { select: { sizeId: true, qty: true } },
      },
    });
  },

  async updateFulfilmentStatus(
    orderId: string,
    fromStatuses: FulfilmentStatus[],
    toStatus: FulfilmentStatus,
    deliveredAt?: Date,
  ): Promise<boolean> {
    const result = await prisma.order.updateMany({
      where: { id: orderId, fulfilmentStatus: { in: fromStatuses } },
      data: { fulfilmentStatus: toStatus, ...(deliveredAt ? { deliveredAt } : {}) },
    });
    return result.count > 0;
  },

  async markCancelled(
    client: DbClient,
    orderId: string,
    fromStatuses: FulfilmentStatus[],
  ): Promise<boolean> {
    const result = await client.order.updateMany({
      where: { id: orderId, fulfilmentStatus: { in: fromStatuses } },
      data: { fulfilmentStatus: FulfilmentStatus.CANCELLED },
    });
    return result.count > 0;
  },

  async markRefunded(client: DbClient, orderId: string): Promise<void> {
    await client.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.REFUNDED },
    });
  },

  async markNeedsManualRefund(client: DbClient, orderId: string): Promise<void> {
    await client.order.update({
      where: { id: orderId },
      data: { needsManualRefund: true },
    });
  },
};
