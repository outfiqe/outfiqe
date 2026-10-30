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

import { SUPERSEDED_BY_RETRY_MARKER, VERIFIABLE_ATTEMPTS_LIMIT } from "./payment.constants.js";

const ORDER_NOT_EXPIRED = false;
const ORDER_EXPIRED = true;

const SUPERSEDED_ATTEMPT_FILTER = {
  status: PaymentTransactionStatus.FAILED,
  rawResponse: { path: [SUPERSEDED_BY_RETRY_MARKER], equals: true },
} satisfies Prisma.PaymentTransactionWhereInput;

const NO_ORDERS_EXPIRED = 0;

const ORDER_TO_VERIFY_SELECT = {
  id: true,
  userId: true,
  paymentStatus: true,
  fulfilmentStatus: true,
  subtotal: true,
  deliveryFee: true,
  total: true,
  paymentMethod: true,
  items: { select: { sizeId: true, qty: true } },
} satisfies Prisma.OrderSelect;

const AWAITING_OUTCOME_FILTER = {
  OR: [{ status: PaymentTransactionStatus.INITIATED }, SUPERSEDED_ATTEMPT_FILTER],
} satisfies Prisma.PaymentTransactionWhereInput;

export const paymentRepository = {
  async findOrderForPayment(orderId: string, userId: string) {
    return prisma.order.findFirst({
      where: { id: orderId, userId },
      select: {
        id: true,
        userId: true,
        paymentMethod: true,
        paymentStatus: true,
        fulfilmentStatus: true,
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

  async findVerifiableTransactions(orderId: string) {
    return prisma.paymentTransaction.findMany({
      where: { orderId, type: PaymentTransactionType.PAYMENT, ...AWAITING_OUTCOME_FILTER },
      orderBy: { createdAt: "desc" },
      take: VERIFIABLE_ATTEMPTS_LIMIT,
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
      where: { id: transactionId, ...AWAITING_OUTCOME_FILTER },
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

  async failPendingTransactions(client: DbClient, orderId: string): Promise<void> {
    await client.paymentTransaction.updateMany({
      where: {
        orderId,
        type: PaymentTransactionType.PAYMENT,
        status: PaymentTransactionStatus.INITIATED,
      },
      data: { status: PaymentTransactionStatus.FAILED },
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

  async expireUnpaidOrder(orderId: string): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id: orderId, paymentStatus: PaymentStatus.INITIATED },
        data: { paymentStatus: PaymentStatus.FAILED, fulfilmentStatus: FulfilmentStatus.CANCELLED },
      });
      if (count === NO_ORDERS_EXPIRED) return ORDER_NOT_EXPIRED;

      await paymentRepository.failPendingTransactions(tx, orderId);
      return ORDER_EXPIRED;
    });
  },

  async findOrdersToReconcile(checkAfter: Date, expireAfter: Date) {
    return prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.INITIATED,
        paymentMethod: { not: PaymentMethod.COD },
        createdAt: { lte: checkAfter, gte: expireAfter },
      },
      select: ORDER_TO_VERIFY_SELECT,
    });
  },

  async findOrdersToExpire(expireAfter: Date) {
    return prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.INITIATED,
        paymentMethod: { not: PaymentMethod.COD },
        createdAt: { lt: expireAfter },
      },
      select: ORDER_TO_VERIFY_SELECT,
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
    refund: { orderId: string; provider: PaymentMethod; amount: number; rawResponse: unknown },
  ): Promise<void> {
    const { rawResponse, ...refundFields } = refund;
    await client.paymentTransaction.create({
      data: {
        ...refundFields,
        type: PaymentTransactionType.REFUND,
        status: PaymentTransactionStatus.SUCCEEDED,
        rawResponse: rawResponse as Prisma.InputJsonValue,
      },
    });
  },
};
