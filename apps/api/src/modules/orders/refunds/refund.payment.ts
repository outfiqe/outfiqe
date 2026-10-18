import { env } from "#config/env.config.js";
import { ORDER_REFUND_OUTCOME, type OrderRefundOutcome } from "#constants/commerce.constants.js";
import { prisma } from "#db/prisma.js";
import {
  refundDetailsNeededTemplate,
  refundFailedTemplate,
} from "#email-templates/order.templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import type { Prisma } from "#generated/prisma/client.js";
import { OrderRefundMethod, OrderRefundStatus, PaymentStatus } from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import logger from "#lib/winston.utils.js";
import { paymentRepository } from "#modules/payments/payment.repository.js";
import { paymentService } from "#modules/payments/payment.service.js";
import { describeError } from "#redis/redis.utils.js";

import {
  PAYMENT_METHODS_WITH_GATEWAY_REFUNDS,
  PAYMENT_STATUSES_WITH_NOTHING_TAKEN_YET,
} from "./refund.constants.js";
import { orderRefundRepository } from "./refund.repository.js";
import { toStoredGatewayResponse } from "./refund.utils.js";

const NO_OPEN_MANUAL_REFUNDS = 0;

export const REFUND_SETTLEMENT = {
  PAID_BY_GATEWAY: "PAID_BY_GATEWAY",
  CASH_NOT_COLLECTED: "CASH_NOT_COLLECTED",
  NEEDS_MANUAL: "NEEDS_MANUAL",
  ALREADY_SETTLED: "ALREADY_SETTLED",
} as const;

export type RefundSettlement = (typeof REFUND_SETTLEMENT)[keyof typeof REFUND_SETTLEMENT];

type RefundToSettle = NonNullable<Awaited<ReturnType<typeof orderRefundRepository.findRefund>>>;

const alertOpsOfManualRefund = (orderId: string, amount: number): void => {
  const { subject, html } = refundFailedTemplate({ orderId, total: amount });
  void sendEmail({
    to: env.OPS_NOTIFICATION_EMAIL,
    subject,
    body: `Order ${orderId} needs a manual refund of Rs. ${amount}.`,
    html,
  });
};

export const askCustomerForRefundDetails = ({
  orderId,
  amount,
  customerEmail,
  isReminder,
}: {
  orderId: string;
  amount: number;
  customerEmail: string;
  isReminder: boolean;
}): void => {
  const { subject, html } = refundDetailsNeededTemplate({
    orderId,
    amount,
    orderUrl: `${env.FRONTEND_URL}/orders/${orderId}`,
    isReminder,
  });
  void sendEmail({
    to: customerEmail,
    subject,
    body: `We owe you a refund of Rs. ${amount}. Add your refund details: ${env.FRONTEND_URL}/orders/${orderId}`,
    html,
  });
};

const announceRefundUpdate = async (
  refund: RefundToSettle,
  outcome: OrderRefundOutcome,
  method: OrderRefundMethod | null,
): Promise<void> => {
  await eventBus.publish(DomainEvents.ORDER_REFUND_UPDATED, {
    orderId: refund.orderId,
    userId: refund.order.userId,
    refundId: refund.id,
    amount: refund.totalAmount,
    outcome,
    method,
  });
};

const syncOrderPaymentStatus = async (
  client: Prisma.TransactionClient,
  orderId: string,
  orderTotal: number,
) => {
  const settledMoneyBack = await orderRefundRepository.sumSettledMoneyBack(client, orderId);
  await orderRefundRepository.setOrderPaymentStatusAfterRefund(
    client,
    orderId,
    settledMoneyBack >= orderTotal ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
  );
};

const sendToManualQueue = async (
  refund: RefundToSettle,
  gatewayResponse?: Prisma.InputJsonValue,
) => {
  await prisma.$transaction(async (tx) => {
    const isMoved = await orderRefundRepository.markRefundNeedsManual(
      tx,
      refund.id,
      gatewayResponse,
    );
    if (isMoved) await orderRefundRepository.setOrderNeedsManualRefund(tx, refund.orderId, true);
  });
  alertOpsOfManualRefund(refund.orderId, refund.totalAmount);
  if (!refund.order.refundDestination) {
    askCustomerForRefundDetails({
      orderId: refund.orderId,
      amount: refund.totalAmount,
      customerEmail: refund.order.user.email,
      isReminder: false,
    });
    await announceRefundUpdate(refund, ORDER_REFUND_OUTCOME.DETAILS_NEEDED, null);
  }
  return REFUND_SETTLEMENT.NEEDS_MANUAL;
};

const payThroughGateway = async (refund: RefundToSettle): Promise<RefundSettlement> => {
  const { order } = refund;
  try {
    const gatewayOutcome = await paymentService.refund({
      orderId: refund.orderId,
      paymentMethod: order.paymentMethod,
      payerPhone: order.phone,
      amount: refund.totalAmount,
    });
    const gatewayResponse = toStoredGatewayResponse(gatewayOutcome.rawResponse);
    if (!gatewayOutcome.succeeded) return sendToManualQueue(refund, gatewayResponse);

    const isSettled = await prisma.$transaction(async (tx) => {
      const isSettledNow = await orderRefundRepository.settleRefund(tx, refund.id, {
        method: OrderRefundMethod.GATEWAY,
        gatewayResponse,
      });
      if (!isSettledNow) return false;
      await paymentRepository.recordRefund(tx, {
        orderId: refund.orderId,
        provider: order.paymentMethod,
        amount: refund.totalAmount,
        rawResponse: gatewayOutcome.rawResponse,
      });
      await syncOrderPaymentStatus(tx, refund.orderId, order.total);
      return true;
    });
    if (isSettled) {
      await announceRefundUpdate(refund, ORDER_REFUND_OUTCOME.ISSUED, OrderRefundMethod.GATEWAY);
    }
    return REFUND_SETTLEMENT.PAID_BY_GATEWAY;
  } catch (error) {
    logger.error(`Refund ${refund.id} failed at the gateway: ${describeError(error)}`);
    return sendToManualQueue(refund);
  }
};

export const settleRefundPayment = async (refundId: string): Promise<RefundSettlement> => {
  const refund = await orderRefundRepository.findRefund(prisma, refundId);
  if (!refund || refund.status !== OrderRefundStatus.PENDING)
    return REFUND_SETTLEMENT.ALREADY_SETTLED;

  if (PAYMENT_STATUSES_WITH_NOTHING_TAKEN_YET.has(refund.order.paymentStatus)) {
    const isSettled = await orderRefundRepository.settleRefund(prisma, refund.id, {
      method: OrderRefundMethod.CASH_NOT_COLLECTED,
    });
    if (isSettled) {
      await announceRefundUpdate(
        refund,
        ORDER_REFUND_OUTCOME.ISSUED,
        OrderRefundMethod.CASH_NOT_COLLECTED,
      );
    }
    return REFUND_SETTLEMENT.CASH_NOT_COLLECTED;
  }
  if (PAYMENT_METHODS_WITH_GATEWAY_REFUNDS.has(refund.order.paymentMethod)) {
    return payThroughGateway(refund);
  }
  return sendToManualQueue(refund);
};

export const markManualRefundPaid = async ({
  refundId,
  paidById,
  transferReference,
}: {
  refundId: string;
  paidById: string;
  transferReference: string;
}): Promise<boolean> => {
  const paidRefund = await prisma.$transaction(async (tx) => {
    const refund = await orderRefundRepository.findRefund(tx, refundId);
    if (!refund) return null;
    const isSettled = await orderRefundRepository.settleRefund(tx, refundId, {
      method: OrderRefundMethod.MANUAL_TRANSFER,
      paidById,
      transferReference,
    });
    if (!isSettled) return null;
    await syncOrderPaymentStatus(tx, refund.orderId, refund.order.total);
    const openManualRefunds = await orderRefundRepository.countOpenManualRefunds(
      tx,
      refund.orderId,
    );
    if (openManualRefunds === NO_OPEN_MANUAL_REFUNDS) {
      await orderRefundRepository.setOrderNeedsManualRefund(tx, refund.orderId, false);
    }
    return refund;
  });
  if (!paidRefund) return false;
  await announceRefundUpdate(
    paidRefund,
    ORDER_REFUND_OUTCOME.ISSUED,
    OrderRefundMethod.MANUAL_TRANSFER,
  );
  return true;
};
