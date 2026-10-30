import { env } from "#config/env.config.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  manualRefundNeededTemplate,
  paymentSettledTemplate,
} from "#email-templates/order.templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import {
  FulfilmentStatus,
  InventoryMovementKind,
  InventoryMovementSource,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionStatus,
} from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { productService } from "#modules/products/product.service.js";
import { userRepository } from "#modules/users/user.repository.js";

import { SUPERSEDED_BY_RETRY_MARKER } from "./payment.constants.js";
import { paymentRepository } from "./payment.repository.js";
import type {
  PaymentInitiateResult,
  PaymentProvider,
  PaymentRefundOutcome,
  PaymentVerifyStatusValue,
} from "./payment.types.js";
import { PaymentVerifyStatus } from "./payment.types.js";
import { esewaProvider } from "./providers/esewa.provider.js";
import { extractKhaltiTransactionId, khaltiProvider } from "./providers/khalti.provider.js";

const SETTLEMENT_OUTCOME = {
  SETTLED_ELSEWHERE: "settled_elsewhere",
  NEEDS_MANUAL_REFUND: "needs_manual_refund",
  PLACED: "placed",
} as const;

const providers: Partial<Record<PaymentMethod, PaymentProvider>> = {
  [PaymentMethod.ESEWA]: esewaProvider,
  [PaymentMethod.KHALTI]: khaltiProvider,
};

const requireProvider = (method: PaymentMethod): PaymentProvider => {
  const provider = providers[method];
  if (!provider) {
    throw new AppError(
      "UNSUPPORTED_PAYMENT_METHOD",
      "This payment method isn't available yet.",
      HTTP_STATUS.BAD_REQUEST,
    );
  }
  return provider;
};

const alertOpsForManualRefund = (orderId: string, total: number): void => {
  const { subject, html } = manualRefundNeededTemplate({ orderId, total });
  void sendEmail({
    to: env.OPS_NOTIFICATION_EMAIL,
    subject,
    body: `Order ${orderId} needs a manual refund.`,
    html,
  });
};

const notifyBuyerPaymentSettled = async (orderId: string, total: number): Promise<void> => {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } });
  if (!order) return;

  const user = await userRepository.findById(order.userId);
  if (!user) return;

  const { subject, html } = paymentSettledTemplate({ orderId, total });
  void sendEmail({
    to: user.email,
    subject,
    body: `Rs. ${total} received for order ${orderId}.`,
    html,
  });
};

const settleVerified = async (
  order: NonNullable<Awaited<ReturnType<typeof paymentRepository.findOrderForPayment>>>,
  transactionId: string,
  rawResponse: unknown,
): Promise<void> => {
  const settlementOutcome = await prisma.$transaction(async (tx) => {
    const settled = await paymentRepository.settleTransaction(tx, transactionId, rawResponse);
    if (!settled) return SETTLEMENT_OUTCOME.SETTLED_ELSEWHERE;

    const insufficientSizeIds = await productService.decrementStockForItems(
      tx,
      order.items.map(({ sizeId, qty }) => ({ sizeId, qty })),
      {
        kind: InventoryMovementKind.ORDER_COMMIT,
        sourceType: InventoryMovementSource.ORDER,
        sourceId: order.id,
      },
    );

    if (insufficientSizeIds.length > 0) {
      await paymentRepository.markOrderNeedsManualRefund(tx, order.id);
      return SETTLEMENT_OUTCOME.NEEDS_MANUAL_REFUND;
    }

    await paymentRepository.markOrderPlaced(tx, order.id);
    return SETTLEMENT_OUTCOME.PLACED;
  });

  if (settlementOutcome === SETTLEMENT_OUTCOME.SETTLED_ELSEWHERE) return;

  if (settlementOutcome === SETTLEMENT_OUTCOME.NEEDS_MANUAL_REFUND) {
    alertOpsForManualRefund(order.id, order.total);
  } else {
    await eventBus.publish(DomainEvents.PRODUCT_PURCHASED, {
      orderId: order.id,
      userId: order.userId,
    });
  }
  await notifyBuyerPaymentSettled(order.id, order.total);
};

type PaymentOrder = NonNullable<Awaited<ReturnType<typeof paymentRepository.findOrderForPayment>>>;
type VerifiableAttempt = Awaited<
  ReturnType<typeof paymentRepository.findVerifiableTransactions>
>[number];

const verifyAttemptWithGateway = (order: PaymentOrder, attempt: VerifiableAttempt) =>
  requireProvider(order.paymentMethod).verify({
    transactionUuid: attempt.id,
    providerRef: attempt.transactionRef,
    totalAmount: order.total,
    initiatedAt: attempt.createdAt,
  });

const verifySupersededAttempt = async (order: PaymentOrder, attempt: VerifiableAttempt) => {
  try {
    return await verifyAttemptWithGateway(order, attempt);
  } catch (error) {
    logger.warn(
      `Could not verify superseded payment attempt ${attempt.id} for order ${order.id}: ${String(error)}`,
    );
    return null;
  }
};

const runVerify = async (order: PaymentOrder): Promise<PaymentVerifyStatusValue> => {
  const attempts = await paymentRepository.findVerifiableTransactions(order.id);

  let openAttemptStatus: PaymentVerifyStatusValue = PaymentVerifyStatus.FAILED;
  for (const attempt of attempts) {
    const isOpenAttempt = attempt.status === PaymentTransactionStatus.INITIATED;
    const verification = isOpenAttempt
      ? await verifyAttemptWithGateway(order, attempt)
      : await verifySupersededAttempt(order, attempt);
    if (!verification) continue;

    const { status, rawResponse } = verification;
    if (status === PaymentVerifyStatus.COMPLETE) {
      await settleVerified(order, attempt.id, rawResponse);
      return status;
    }
    if (!isOpenAttempt) continue;

    if (status === PaymentVerifyStatus.FAILED) {
      await paymentRepository.failTransaction(attempt.id, rawResponse);
    }
    openAttemptStatus = status;
  }

  return openAttemptStatus;
};

export const paymentService = {
  async initiate(userId: string, orderId: string): Promise<PaymentInitiateResult> {
    const order = await paymentRepository.findOrderForPayment(orderId, userId);
    if (!order) throw new AppError("NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND);
    if (order.paymentMethod === PaymentMethod.COD) {
      throw new AppError(
        "INVALID_PAYMENT_METHOD",
        "This order is cash on delivery.",
        HTTP_STATUS.CONFLICT,
      );
    }
    if (order.fulfilmentStatus === FulfilmentStatus.CANCELLED) {
      throw new AppError("ORDER_CANCELLED", "This order was cancelled.", HTTP_STATUS.CONFLICT);
    }
    if (order.paymentStatus !== PaymentStatus.INITIATED) {
      throw new AppError(
        "ALREADY_SETTLED",
        "This order has already been paid.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const priorAttempt = await paymentRepository.findPendingTransaction(order.id);
    if (priorAttempt?.transactionRef) {
      const priorAttemptStatus = await runVerify(order);
      if (priorAttemptStatus === PaymentVerifyStatus.COMPLETE) {
        throw new AppError(
          "ALREADY_SETTLED",
          "This order has already been paid.",
          HTTP_STATUS.CONFLICT,
        );
      }
      await paymentRepository.failTransaction(priorAttempt.id, {
        [SUPERSEDED_BY_RETRY_MARKER]: true,
      });
    }

    const provider = requireProvider(order.paymentMethod);
    const transaction = await paymentRepository.getOrCreatePendingTransaction(
      order.id,
      order.paymentMethod,
    );

    const providerSlug = order.paymentMethod.toLowerCase();
    const callbackUrl = `${env.FRONTEND_URL}/payments/${providerSlug}/callback/${order.id}`;

    const result = await provider.initiate({
      transactionUuid: transaction.id,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      totalAmount: order.total,
      successUrl: callbackUrl,
      failureUrl: `${callbackUrl}/failed`,
    });

    if (result.providerRef) {
      await paymentRepository.setTransactionRef(transaction.id, result.providerRef);
    }

    return result;
  },

  async verify(userId: string, orderId: string): Promise<{ status: PaymentVerifyStatusValue }> {
    const order = await paymentRepository.findOrderForPayment(orderId, userId);
    if (!order) throw new AppError("NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND);

    if (order.paymentStatus !== PaymentStatus.INITIATED) {
      return {
        status:
          order.paymentStatus === PaymentStatus.PAID
            ? PaymentVerifyStatus.COMPLETE
            : PaymentVerifyStatus.FAILED,
      };
    }

    const status = await runVerify(order);
    return { status };
  },

  async refund({
    orderId,
    paymentMethod,
    payerPhone,
    amount,
  }: {
    orderId: string;
    paymentMethod: PaymentMethod;
    payerPhone: string;
    amount: number;
  }): Promise<PaymentRefundOutcome> {
    const provider = providers[paymentMethod];
    if (!provider?.refund) {
      return {
        succeeded: false,
        automated: false,
        rawResponse: { note: `${paymentMethod} refunds are paid by Outfiqe staff.` },
      };
    }

    const transaction = await paymentRepository.findSucceededTransaction(orderId);
    const gatewayTransactionId = transaction
      ? extractKhaltiTransactionId(transaction.rawResponse)
      : null;
    if (!gatewayTransactionId) {
      return {
        succeeded: false,
        automated: true,
        rawResponse: { reason: "missing gateway transaction id" },
      };
    }

    const result = await provider.refund({ gatewayTransactionId, payerPhone, amount });
    return { ...result, automated: true };
  },
};

export const reconcilePendingPayment = runVerify;
