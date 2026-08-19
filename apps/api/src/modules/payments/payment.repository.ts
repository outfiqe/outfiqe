import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  FulfilmentStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

export const paymentRepository = {
  async findOrderForPayment(orderId: string, userId: string) {
    return prisma.order.findFirst({
      where: { id: orderId, userId },
      select: {
        id: true,
        userId: true,
        paymentMethod: true,
        paymentStatus: true,
        subtotal: true,
        deliveryFee: true,
        total: true,
        items: { select: { sizeId: true, qty: true } },
      },
    });
  },

  async getOrCreatePendingTransaction(orderId: string, provider: PaymentMethod) {
    const existing = await prisma.paymentTransaction.findFirst({
      where: {
        orderId,
        provider,
        type: PaymentTransactionType.PAYMENT,
        status: PaymentTransactionStatus.INITIATED,
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return existing;

    return prisma.paymentTransaction.create({
      data: {
        orderId,
        provider,
        type: PaymentTransactionType.PAYMENT,
        status: PaymentTransactionStatus.INITIATED,
      },
    });
  },

  async findPendingTransaction(orderId: string) {
    return prisma.paymentTransaction.findFirst({
      where: {
        orderId,
        type: PaymentTransactionType.PAYMENT,
        status: PaymentTransactionStatus.INITIATED,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async setTransactionRef(transactionId: string, transactionRef: string): Promise<void> {
    await prisma.paymentTransaction.updateMany({
      where: { id: transactionId, status: PaymentTransactionStatus.INITIATED },
      data: { transactionRef },
    });
  },

  async settleTransaction(
    client: DbClient,
    transactionId: string,
    rawResponse: unknown,
  ): Promise<boolean> {
    const result = await client.paymentTransaction.updateMany({
      where: { id: transactionId, status: PaymentTransactionStatus.INITIATED },
      data: {
        status: PaymentTransactionStatus.SUCCEEDED,
        rawResponse: rawResponse as Prisma.InputJsonValue,
      },
    });
    return result.count > 0;
  },

  async failTransaction(transactionId: string, rawResponse: unknown): Promise<void> {
    await prisma.paymentTransaction.updateMany({
      where: { id: transactionId, status: PaymentTransactionStatus.INITIATED },
      data: {
        status: PaymentTransactionStatus.FAILED,
        rawResponse: rawResponse as Prisma.InputJsonValue,
      },
    });
  },

  async markOrderPlaced(client: DbClient, orderId: string): Promise<void> {
    await client.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.PAID, fulfilmentStatus: FulfilmentStatus.PLACED },
    });
  },

  async markOrderNeedsManualRefund(client: DbClient, orderId: string): Promise<void> {
    await client.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        fulfilmentStatus: FulfilmentStatus.CANCELLED,
        needsManualRefund: true,
      },
    });
  },

  async markOrderFailed(orderId: string): Promise<void> {
    await prisma.order.updateMany({
      where: { id: orderId, paymentStatus: PaymentStatus.INITIATED },
      data: { paymentStatus: PaymentStatus.FAILED, fulfilmentStatus: FulfilmentStatus.CANCELLED },
    });
  },

  async findOrdersToReconcile(checkAfter: Date, expireAfter: Date) {
    return prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.INITIATED,
        paymentMethod: { not: PaymentMethod.COD },
        createdAt: { lte: checkAfter, gte: expireAfter },
      },
      select: {
        id: true,
        userId: true,
        paymentStatus: true,
        subtotal: true,
        deliveryFee: true,
        total: true,
        paymentMethod: true,
        items: { select: { sizeId: true, qty: true } },
      },
    });
  },

  async findOrdersToExpire(expireAfter: Date) {
    return prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.INITIATED,
        paymentMethod: { not: PaymentMethod.COD },
        createdAt: { lt: expireAfter },
      },
      select: { id: true },
    });
  },

  async findSucceededTransaction(orderId: string) {
    return prisma.paymentTransaction.findFirst({
      where: {
        orderId,
        type: PaymentTransactionType.PAYMENT,
        status: PaymentTransactionStatus.SUCCEEDED,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async recordRefund(
    client: DbClient,
    orderId: string,
    provider: PaymentMethod,
    rawResponse: unknown,
  ): Promise<void> {
    await client.paymentTransaction.create({
      data: {
        orderId,
        provider,
        type: PaymentTransactionType.REFUND,
        status: PaymentTransactionStatus.SUCCEEDED,
        rawResponse: rawResponse as Prisma.InputJsonValue,
      },
    });
  },
};
