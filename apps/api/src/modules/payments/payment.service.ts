import { env } from "#config/env.config.js";
import { prisma } from "#db/prisma.js";
import { manualRefundNeededTemplate, paymentSettledTemplate } from "#email-templates/templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { PaymentMethod, PaymentStatus } from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { productService } from "#modules/products/product.service.js";
import { userRepository } from "#modules/users/user.repository.js";

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

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const BAD_REQUEST_STATUS = 400;

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
      BAD_REQUEST_STATUS,
    );
  }
  return provider;
};

const alertOpsForManualRefund = (orderId: string, total: number): void => {
  const { subject, html } = manualRefundNeededTemplate({ orderId, total });
  void sendEmail({
    to: env.GMAIL_USER,
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
  const needsManualRefund = await prisma.$transaction(async (tx) => {
    const settled = await paymentRepository.settleTransaction(tx, transactionId, rawResponse);
    if (!settled) return false;

    const insufficientSizeIds = await productService.decrementStockForItems(
      tx,
      order.items.map(({ sizeId, qty }) => ({ sizeId, qty })),
    );

    if (insufficientSizeIds.length > 0) {
      await paymentRepository.markOrderNeedsManualRefund(tx, order.id);
      return true;
    }

    await paymentRepository.markOrderPlaced(tx, order.id);
    return false;
  });

  if (needsManualRefund) {
    alertOpsForManualRefund(order.id, order.total);
  } else {
    await eventBus.publish(DomainEvents.PRODUCT_PURCHASED, {
      orderId: order.id,
      userId: order.userId,
    });
  }
  await notifyBuyerPaymentSettled(order.id, order.total);
};

const runVerify = async (
  order: NonNullable<Awaited<ReturnType<typeof paymentRepository.findOrderForPayment>>>,
): Promise<PaymentVerifyStatusValue> => {
  const transaction = await paymentRepository.findPendingTransaction(order.id);
  if (!transaction) return PaymentVerifyStatus.FAILED;

  const provider = requireProvider(order.paymentMethod);
  const { status, rawResponse } = await provider.verify({
    transactionUuid: transaction.id,
    providerRef: transaction.transactionRef,
    totalAmount: order.total,
  });

  if (status === PaymentVerifyStatus.COMPLETE) {
    await settleVerified(order, transaction.id, rawResponse);
  } else if (status === PaymentVerifyStatus.FAILED) {
    await paymentRepository.failTransaction(transaction.id, rawResponse);
  }

  return status;
};

export const paymentService = {
  async initiate(userId: string, orderId: string): Promise<PaymentInitiateResult> {
    const order = await paymentRepository.findOrderForPayment(orderId, userId);
    if (!order) throw new AppError("NOT_FOUND", "Order not found.", NOT_FOUND_STATUS);
    if (order.paymentMethod === PaymentMethod.COD) {
      throw new AppError(
        "INVALID_PAYMENT_METHOD",
        "This order is cash on delivery.",
        CONFLICT_STATUS,
      );
    }
    if (order.paymentStatus !== PaymentStatus.INITIATED) {
      throw new AppError("ALREADY_SETTLED", "This order has already been paid.", CONFLICT_STATUS);
    }

    const provider = requireProvider(order.paymentMethod);
    const transaction = await paymentRepository.getOrCreatePendingTransaction(
      order.id,
      order.paymentMethod,
    );

    const providerSlug = order.paymentMethod.toLowerCase();
    const callbackUrl = `${env.FRONTEND_URL}/payments/${providerSlug}/callback?orderId=${order.id}`;

    const result = await provider.initiate({
      transactionUuid: transaction.id,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      totalAmount: order.total,
      successUrl: callbackUrl,
      failureUrl: callbackUrl,
    });

    if (result.providerRef) {
      await paymentRepository.setTransactionRef(transaction.id, result.providerRef);
    }

    return result;
  },

  async verify(userId: string, orderId: string): Promise<{ status: PaymentVerifyStatusValue }> {
    const order = await paymentRepository.findOrderForPayment(orderId, userId);
    if (!order) throw new AppError("NOT_FOUND", "Order not found.", NOT_FOUND_STATUS);

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

  async refund(
    orderId: string,
    paymentMethod: PaymentMethod,
    payerPhone: string,
  ): Promise<PaymentRefundOutcome> {
    const provider = providers[paymentMethod];
    if (!provider?.refund) {
      return {
        succeeded: true,
        automated: false,
        rawResponse: { note: `${paymentMethod} refunds are handled manually outside Outfiqe.` },
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

    const result = await provider.refund({ gatewayTransactionId, payerPhone });
    return { ...result, automated: true };
  },
};

export const reconcilePendingPayment = runVerify;
