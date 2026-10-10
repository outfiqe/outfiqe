import { randomUUID } from "node:crypto";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { PaymentMethod, PaymentStatus, PaymentTransactionStatus } from "#generated/prisma/enums.js";
import { withIdempotency } from "#lib/idempotency.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { cartRepository } from "#modules/cart/cart.repository.js";
import { couponService } from "#modules/coupons/coupon.service.js";
import { creatorLinkRepository } from "#modules/creator-links/creator-link.repository.js";
import { userRepository } from "#modules/users/user.repository.js";

import { orderRepository } from "../order.repository.js";
import type { CheckoutBody } from "../order.schemas.js";
import type { OrderView } from "../order.types.js";
import { toOrderView } from "../order.utils.js";
import { publishCheckoutEvents, sendOrderConfirmationEmails } from "./checkout.after-commit.js";
import { resolveCheckoutAttributions } from "./checkout.attribution.js";
import {
  assignBrandFulfilmentGroups,
  commitCashOnDeliveryStock,
  redeemCheckoutCoupon,
} from "./checkout.commit.js";
import { CHECKOUT_ENDPOINT } from "./checkout.constants.js";
import { assertCheckoutLinesInStock, loadCheckoutLines } from "./checkout.lines.js";
import { priceCheckout } from "./checkout.pricing.js";
import {
  loadCheckoutSettlementTerms,
  recordItemPayoutsAndCommissions,
} from "./checkout.settlement.js";
import { toAttributedOrderItems } from "./checkout.utils.js";

const checkoutOnce = async (
  userId: string,
  userEmail: string,
  body: CheckoutBody,
): Promise<OrderView> => {
  const { fullName, phone, address, city, landmark, paymentMethod, sessionId, buyNow, couponCode } =
    body;

  if (sessionId) await creatorLinkRepository.bridgeSessionClicks(sessionId, userId);

  const { id: cartId, appliedCouponCode } = await cartRepository.getOrCreateCart(userId);

  const lines = await loadCheckoutLines(cartId, buyNow);
  await assertCheckoutLinesInStock(lines, Boolean(buyNow));

  const orderPlacedAt = new Date();
  const {
    pricedLines,
    couponResolution,
    subtotal,
    brandDiscountTotal,
    platformDiscountTotal,
    deliveryFee,
    codFee,
    total,
  } = await priceCheckout({
    userId,
    lines,
    paymentMethod,
    city,
    couponCode: buyNow ? couponCode : (appliedCouponCode ?? undefined),
    orderPlacedAt,
  });

  const lineAttributions = await resolveCheckoutAttributions(userId, pricedLines, orderPlacedAt);
  const items = toAttributedOrderItems(pricedLines, lineAttributions.attributions);

  const isCashOnDelivery = paymentMethod === PaymentMethod.COD;
  const paymentStatus = isCashOnDelivery ? PaymentStatus.DUE : PaymentStatus.INITIATED;
  const paymentTransactionStatus = isCashOnDelivery
    ? PaymentTransactionStatus.SUCCEEDED
    : PaymentTransactionStatus.INITIATED;

  const distinctBrandIds = [...new Set(lines.map((line) => line.brandId))];
  const settlementTerms = await loadCheckoutSettlementTerms(
    paymentMethod,
    distinctBrandIds,
    orderPlacedAt,
  );

  const orderId = randomUUID();

  const { order, createdCommissions } = await prisma.$transaction(async (tx) => {
    if (isCashOnDelivery) await commitCashOnDeliveryStock(tx, lines, orderId);

    const createdOrder = await orderRepository.create(tx, {
      id: orderId,
      userId,
      fullName,
      phone,
      address,
      city,
      landmark,
      paymentMethod,
      paymentStatus,
      paymentTransactionStatus,
      subtotal,
      deliveryFee,
      codFee,
      total,
      brandDiscountTotal,
      platformDiscountTotal,
      items,
    });

    if (couponResolution) {
      await redeemCheckoutCoupon(tx, {
        couponResolution,
        userId,
        orderId: createdOrder.id,
        platformDiscountTotal,
      });
    }

    await assignBrandFulfilmentGroups(tx, {
      orderId: createdOrder.id,
      orderItems: createdOrder.items,
      pricedLines,
      distinctBrandIds,
    });

    const commissionsForCreators = await recordItemPayoutsAndCommissions(tx, {
      orderItems: createdOrder.items,
      pricedLines,
      paymentMethod,
      settlementTerms,
      lineAttributions,
    });

    return { order: createdOrder, createdCommissions: commissionsForCreators };
  });

  if (!buyNow) await cartRepository.clearCart(cartId);

  if (couponResolution) {
    await couponService.afterRedemptionCommitted({
      couponId: couponResolution.coupon.id,
      orderId: order.id,
      phone,
      address,
    });
  }

  await publishCheckoutEvents({ orderId: order.id, userId, paymentMethod, createdCommissions });

  const orderView = toOrderView(order);
  sendOrderConfirmationEmails(userEmail, orderView);

  return orderView;
};

export const orderCheckoutService = {
  async checkout(
    userId: string,
    body: CheckoutBody,
    idempotencyKey: string | undefined,
  ): Promise<OrderView> {
    return withIdempotency(userId, CHECKOUT_ENDPOINT, idempotencyKey, async () => {
      const user = await userRepository.findById(userId);
      if (!user) throw new AppError("NOT_FOUND", "Account not found.", HTTP_STATUS.NOT_FOUND);
      return checkoutOnce(userId, user.email, body);
    });
  },
};
