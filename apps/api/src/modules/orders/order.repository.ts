import { prisma } from "#db/prisma.js";
import { PaymentTransactionType } from "#generated/prisma/enums.js";
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
      include: { items: { include: withOrderItemDetails } },
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
};
