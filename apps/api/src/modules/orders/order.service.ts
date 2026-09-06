import { env } from "#config/env.config.js";
import { prisma } from "#db/prisma.js";
import {
  newOrderNotificationTemplate,
  orderCancelledTemplate,
  orderConfirmationTemplate,
  refundFailedTemplate,
} from "#email-templates/templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import {
  CommissionSource,
  CouponRedemptionStatus,
  FulfilmentStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionStatus,
  ProductStatus,
} from "#generated/prisma/enums.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { sendEmail } from "#lib/email.utils.js";
import { withIdempotency } from "#lib/idempotency.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { brandPayoutRepository } from "#modules/brand-payouts/brandPayout.repository.js";
import {
  computeGatewayFee,
  computeTieredPlatformFee,
} from "#modules/brand-payouts/brandPayout.utils.js";
import { cartRepository } from "#modules/cart/cart.repository.js";
import { commissionRepository } from "#modules/commissions/commission.repository.js";
import { couponRepository } from "#modules/coupons/coupon.repository.js";
import { couponService } from "#modules/coupons/coupon.service.js";
import type { CouponLine } from "#modules/coupons/coupon.types.js";
import { creatorLinkRepository } from "#modules/creator-links/creatorLink.repository.js";
import { deliveryZoneService } from "#modules/delivery-zones/deliveryZone.service.js";
import {
  assertOrderMoneyInvariant,
  resolveBrandFundedUnitPrice,
  toActiveBrandDiscount,
} from "#modules/discounts/discount.utils.js";
import { paymentRepository } from "#modules/payments/payment.repository.js";
import { paymentService } from "#modules/payments/payment.service.js";
import { productRepository } from "#modules/products/product.repository.js";
import { productService } from "#modules/products/product.service.js";
import { userRepository } from "#modules/users/user.repository.js";

import { resolveAttribution } from "./order.attribution.utils.js";
import { orderRepository } from "./order.repository.js";
import type {
  AdvanceFulfilmentBody,
  CheckoutBody,
  ListAdminOrdersQuery,
  ListBrandOrdersQuery,
  ListOrdersQuery,
} from "./order.schemas.js";
import type {
  BrandOrderItemView,
  CancelOrderActor,
  CreateOrderItemInput,
  OrderAdminSummaryView,
  OrderAdminView,
} from "./order.types.js";
import { type OrderSummaryView, type OrderView } from "./order.types.js";
import {
  toBrandOrderItemView,
  toOrderAdminSummaryView,
  toOrderAdminView,
  toOrderSummaryView,
  toOrderView,
} from "./order.utils.js";

const CHECKOUT_ENDPOINT = "orders.checkout";
const CART_EMPTY_STATUS = 400;
const ITEMS_UNAVAILABLE_STATUS = 409;
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const SERVICE_UNAVAILABLE_STATUS = 503;

const FULFILMENT_ADVANCE_FROM: Partial<Record<FulfilmentStatus, FulfilmentStatus[]>> = {
  [FulfilmentStatus.PACKED]: [FulfilmentStatus.PLACED],
  [FulfilmentStatus.SHIPPED]: [FulfilmentStatus.PACKED],
  [FulfilmentStatus.DELIVERED]: [FulfilmentStatus.SHIPPED],
};

const CANCELLABLE_FULFILMENT_STATUSES: FulfilmentStatus[] = [
  FulfilmentStatus.PLACED,
  FulfilmentStatus.PACKED,
];

const buildOrderConfirmationEmail = (userEmail: string, order: OrderView): void => {
  const { subject, html } = orderConfirmationTemplate({
    orderId: order.id,
    total: order.total,
    paymentMethod: order.paymentMethod,
  });
  void sendEmail({
    to: userEmail,
    subject,
    body: `Order ${order.id} placed — Rs. ${order.total}.`,
    html,
  });

  const opsEmail = newOrderNotificationTemplate({ orderId: order.id, total: order.total });
  void sendEmail({
    to: env.OPS_NOTIFICATION_EMAIL,
    subject: opsEmail.subject,
    body: `Order ${order.id} — Rs. ${order.total}.`,
    html: opsEmail.html,
  });
};

const buildCouponLinesForPricedLines = async (
  pricedLines: {
    productId: string;
    brandId: string;
    unitPrice: number;
    qty: number;
    brandDiscountAmount: number;
  }[],
): Promise<CouponLine[]> => {
  const eligibilityAttributesByProductId = await productRepository.findEligibilityAttributesByIds([
    ...new Set(pricedLines.map((line) => line.productId)),
  ]);

  return pricedLines.map((line, index) => {
    const attributes = eligibilityAttributesByProductId.get(line.productId);
    return {
      lineId: String(index),
      productId: line.productId,
      brandId: line.brandId,
      productTypeId: attributes?.productTypeId ?? "",
      categoryIds: attributes?.categoryIds ?? [],
      eligibleAmount: line.unitPrice * line.qty,
      hasBrandDiscount: line.brandDiscountAmount > 0,
    };
  });
};

const checkoutOnce = async (
  userId: string,
  userEmail: string,
  body: CheckoutBody,
): Promise<OrderView> => {
  const { fullName, phone, address, city, landmark, paymentMethod, sessionId, buyNow } = body;

  if (sessionId) await creatorLinkRepository.bridgeSessionClicks(sessionId, userId);

  const { id: cartId, appliedCouponCode } = await cartRepository.getOrCreateCart(userId);

  let lines: {
    productId: string;
    sizeId: string;
    qty: number;
    listUnitPrice: number;
    brandId: string;
  }[];

  if (buyNow) {
    const product = await productRepository.findById(buyNow.productId);
    if (!product || product.status !== ProductStatus.APPROVED || product.deletedAt) {
      throw new AppError("NOT_FOUND", "This product is no longer available.", NOT_FOUND_STATUS);
    }
    const ownedSizeIds = await productRepository.findSizeIdsForProduct(buyNow.productId, [
      buyNow.sizeId,
    ]);
    if (ownedSizeIds.length === 0) {
      throw new AppError("NOT_FOUND", "This size is no longer available.", NOT_FOUND_STATUS);
    }
    lines = [
      {
        productId: buyNow.productId,
        sizeId: buyNow.sizeId,
        qty: buyNow.qty,
        listUnitPrice: product.price,
        brandId: product.brandId,
      },
    ];
  } else {
    const cartRows = await cartRepository.listItems(cartId);
    if (cartRows.length === 0) {
      throw new AppError("CART_EMPTY", "Your bag is empty.", CART_EMPTY_STATUS);
    }
    lines = cartRows.map(({ productId, sizeId, qty, product }) => ({
      productId,
      sizeId,
      qty,
      listUnitPrice: product.price,
      brandId: product.brandId,
    }));
  }

  const stockBySizeId = await productRepository.getStockBySizeIds(lines.map((line) => line.sizeId));
  const unavailable = lines.filter((line) => (stockBySizeId.get(line.sizeId) ?? 0) < line.qty);
  if (unavailable.length > 0) {
    throw new AppError(
      "ITEMS_UNAVAILABLE",
      buyNow
        ? "This item is no longer available."
        : "Some items in your bag are no longer available.",
      ITEMS_UNAVAILABLE_STATUS,
      { sizeIds: unavailable.map((line) => line.sizeId) },
    );
  }

  const orderPlacedAt = new Date();
  const activeDiscountsByProductId = await productRepository.findActiveDiscountsByProductIds(
    [...new Set(lines.map((line) => line.productId))],
    orderPlacedAt,
  );

  const pricedLinesWithoutCoupon = lines.map((line) => {
    const activeDiscount = activeDiscountsByProductId.get(line.productId);
    const unitPrice = resolveBrandFundedUnitPrice(
      line.listUnitPrice,
      toActiveBrandDiscount(activeDiscount),
    );
    return {
      ...line,
      unitPrice,
      brandDiscountAmount: line.listUnitPrice - unitPrice,
      platformDiscountAmount: 0,
    };
  });

  const couponCode = buyNow ? undefined : (appliedCouponCode ?? undefined);
  const couponResolution = couponCode
    ? await couponService.resolveForContext(couponCode, {
        userId,
        paymentMethod,
        lines: await buildCouponLinesForPricedLines(pricedLinesWithoutCoupon),
        at: orderPlacedAt,
      })
    : null;

  const platformDiscountByLineId = new Map(
    couponResolution?.valuation.allocations.map((allocation) => [
      allocation.lineId,
      allocation.discountAmount,
    ]) ?? [],
  );

  const pricedLines = pricedLinesWithoutCoupon.map((line, index) => ({
    ...line,
    platformDiscountAmount: platformDiscountByLineId.get(String(index)) ?? 0,
  }));

  const subtotal = pricedLines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
  const brandDiscountTotal = pricedLines.reduce(
    (sum, line) => sum + line.brandDiscountAmount * line.qty,
    0,
  );
  const platformDiscountTotal = couponResolution?.valuation.discountAmount ?? 0;
  const feeValues = await deliveryZoneService.resolveFeeValuesForCity(city);
  const deliveryFee =
    subtotal >= feeValues.freeDeliveryThreshold ? 0 : feeValues.standardDeliveryFee;
  const codFee = paymentMethod === PaymentMethod.COD ? feeValues.codHandlingFee : 0;
  const total = subtotal - platformDiscountTotal + deliveryFee + codFee;

  assertOrderMoneyInvariant({
    subtotal,
    platformDiscountTotal,
    deliveryFee,
    codFee,
    total,
    platformDiscountAllocations: pricedLines.map((line) => line.platformDiscountAmount),
  });

  const attributions = await Promise.all(
    pricedLines.map((line) => resolveAttribution(userId, line.productId, orderPlacedAt)),
  );
  const tiers = await Promise.all(
    pricedLines.map((line, index) =>
      attributions[index]
        ? commissionRepository.findTierForPrice(line.unitPrice)
        : Promise.resolve(null),
    ),
  );

  const items: CreateOrderItemInput[] = pricedLines.map((line, index) => {
    const { brandId: _brandId, ...orderItemLine } = line;
    const attribution = attributions[index];
    if (!attribution) return { ...orderItemLine, attributionSource: undefined };

    const { source, creatorId, referenceId } = attribution;
    const isTagClick = source === CommissionSource.TAG_CLICK;
    return {
      ...orderItemLine,
      attributedCreatorId: creatorId,
      attributedCreatorLookId: isTagClick ? referenceId : undefined,
      attributedLinkId: isTagClick ? undefined : referenceId,
      attributionSource: source,
    };
  });

  const paymentStatus =
    paymentMethod === PaymentMethod.COD ? PaymentStatus.DUE : PaymentStatus.INITIATED;
  const paymentTransactionStatus =
    paymentMethod === PaymentMethod.COD
      ? PaymentTransactionStatus.SUCCEEDED
      : PaymentTransactionStatus.INITIATED;

  const commissionRule = await brandPayoutRepository.findActiveRuleWithTiers();
  if (!commissionRule) {
    throw new AppError(
      "COMMISSION_RULE_NOT_CONFIGURED",
      "Checkout isn't available right now. Please try again shortly.",
      SERVICE_UNAVAILABLE_STATUS,
    );
  }

  const gatewayFeeRate =
    paymentMethod === PaymentMethod.COD
      ? null
      : await brandPayoutRepository.findActiveGatewayFeeRate(paymentMethod);

  const distinctBrandIds = [...new Set(lines.map((line) => line.brandId))];
  const exemptBrandIds = await brandPayoutRepository.findActiveExemptBrandIds(
    distinctBrandIds,
    orderPlacedAt,
  );

  const createdCommissions: { creatorId: string; orderItemId: string; amount: number }[] = [];

  const order = await prisma.$transaction(async (tx) => {
    if (paymentMethod === PaymentMethod.COD) {
      const insufficientSizeIds = await productService.decrementStockForItems(
        tx,
        lines.map(({ sizeId, qty }) => ({ sizeId, qty })),
      );
      if (insufficientSizeIds.length > 0) {
        throw new AppError(
          "ITEMS_UNAVAILABLE",
          "Some items sold out just now.",
          ITEMS_UNAVAILABLE_STATUS,
          {
            sizeIds: insufficientSizeIds,
          },
        );
      }
    }

    const createdOrder = await orderRepository.create(tx, {
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
      const claimed = await couponRepository.claimBudget(
        tx,
        couponResolution.coupon.id,
        platformDiscountTotal,
      );
      if (!claimed) {
        throw new AppError(
          "COUPON_EXHAUSTED",
          "This coupon has reached its limit.",
          CONFLICT_STATUS,
        );
      }
      try {
        await couponRepository.createRedemption(tx, {
          couponId: couponResolution.coupon.id,
          userId,
          orderId: createdOrder.id,
          discountAmount: platformDiscountTotal,
          platformFundedAmount: platformDiscountTotal,
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new AppError(
            "COUPON_ALREADY_USED",
            "You've already used this coupon.",
            CONFLICT_STATUS,
          );
        }
        throw error;
      }
    }

    for (const [index, orderItem] of createdOrder.items.entries()) {
      const line = pricedLines[index];
      if (line) {
        const grossAmount = line.unitPrice * line.qty;
        const isExemptBrand = exemptBrandIds.has(line.brandId);
        const { fee: platformFee, tierId: platformCommissionTierId } = isExemptBrand
          ? { fee: 0, tierId: null }
          : computeTieredPlatformFee(grossAmount, commissionRule.tiers);
        const gatewayFee = computeGatewayFee(grossAmount, paymentMethod, gatewayFeeRate);

        await brandPayoutRepository.createPending(tx, {
          orderItemId: orderItem.id,
          brandId: line.brandId,
          commissionRuleId: commissionRule.id,
          platformCommissionTierId,
          grossAmount,
          platformFee,
          gatewayFee,
          netAmount: grossAmount - platformFee - gatewayFee,
        });
      }

      const attribution = attributions[index];
      const tier = tiers[index];
      if (!attribution || !tier) continue;

      const { source, creatorId, clickId } = attribution;
      const { id: tierId, amount } = tier;
      const isTagClick = source === CommissionSource.TAG_CLICK;

      await commissionRepository.createPending(tx, {
        creatorId,
        orderItemId: orderItem.id,
        source,
        tagClickId: isTagClick ? clickId : undefined,
        linkClickId: isTagClick ? undefined : clickId,
        tierId,
        amount,
      });
      createdCommissions.push({ creatorId, orderItemId: orderItem.id, amount });
    }

    return createdOrder;
  });

  if (!buyNow) await cartRepository.clearCart(cartId);

  if (couponResolution) {
    await couponService.afterRedemptionCommitted(couponResolution.coupon.id);
  }

  if (paymentMethod === PaymentMethod.COD) {
    await eventBus.publish(DomainEvents.PRODUCT_PURCHASED, { orderId: order.id, userId });
  }
  for (const commission of createdCommissions) {
    await eventBus.publish(DomainEvents.SALE_GENERATED, {
      orderItemId: commission.orderItemId,
      creatorId: commission.creatorId,
      commissionAmount: commission.amount,
    });
  }

  const orderView = toOrderView(order);
  buildOrderConfirmationEmail(userEmail, orderView);

  return orderView;
};

export const orderService = {
  async checkout(
    userId: string,
    body: CheckoutBody,
    idempotencyKey: string | undefined,
  ): Promise<OrderView> {
    return withIdempotency(userId, CHECKOUT_ENDPOINT, idempotencyKey, async () => {
      const user = await userRepository.findById(userId);
      if (!user) throw new AppError("NOT_FOUND", "Account not found.", NOT_FOUND_STATUS);
      return checkoutOnce(userId, user.email, body);
    });
  },

  async getOrder(userId: string, orderId: string): Promise<OrderView> {
    const order = await orderRepository.findByIdForUser(userId, orderId);
    if (!order) throw new AppError("NOT_FOUND", "Order not found.", NOT_FOUND_STATUS);
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
    if (!order) throw new AppError("NOT_FOUND", "Order not found.", NOT_FOUND_STATUS);
    return toOrderAdminView(order);
  },

  async advanceFulfilment(orderId: string, { status }: AdvanceFulfilmentBody): Promise<void> {
    const order = await orderRepository.findForAdminAction(orderId);
    if (!order) throw new AppError("NOT_FOUND", "Order not found.", NOT_FOUND_STATUS);

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
        CONFLICT_STATUS,
      );
    }

    await eventBus.publish(DomainEvents.ORDER_STATUS_CHANGED, {
      orderId,
      userId: order.userId,
      status,
    });
  },

  async cancel(orderId: string, actor: CancelOrderActor, reason: string): Promise<void> {
    const order = await orderRepository.findForAdminAction(orderId);
    if (!order) throw new AppError("NOT_FOUND", "Order not found.", NOT_FOUND_STATUS);
    if (actor.type === "BUYER" && order.userId !== actor.userId) {
      throw new AppError("NOT_FOUND", "Order not found.", NOT_FOUND_STATUS);
    }
    if (!CANCELLABLE_FULFILMENT_STATUSES.includes(order.fulfilmentStatus)) {
      throw new AppError(
        "INVALID_TRANSITION",
        "Only orders that haven't shipped yet can be cancelled.",
        CONFLICT_STATUS,
      );
    }

    const refundOutcome =
      order.paymentStatus === PaymentStatus.PAID
        ? await paymentService.refund(orderId, order.paymentMethod, order.phone)
        : null;

    const cancelled = await prisma.$transaction(async (tx) => {
      const ok = await orderRepository.markCancelled(tx, orderId, CANCELLABLE_FULFILMENT_STATUSES);
      if (!ok) return false;

      await productService.restoreStockForItems(tx, order.items);
      await commissionRepository.voidForOrder(tx, orderId, reason);
      await brandPayoutRepository.voidForOrder(tx, orderId, reason);

      const redemption = await couponRepository.findRedemptionByOrderId(tx, orderId);
      if (redemption && redemption.status !== CouponRedemptionStatus.RELEASED) {
        await couponRepository.markRedemptionReleased(
          tx,
          redemption.id,
          CouponRedemptionStatus.RELEASED,
          reason,
        );
        await couponRepository.releaseBudget(
          tx,
          redemption.couponId,
          redemption.platformFundedAmount,
        );
      }

      if (refundOutcome) {
        await paymentRepository.recordRefund(
          tx,
          orderId,
          order.paymentMethod,
          refundOutcome.rawResponse,
        );
        if (refundOutcome.succeeded) {
          await orderRepository.markRefunded(tx, orderId);
        } else {
          await orderRepository.markNeedsManualRefund(tx, orderId);
        }
      }

      return true;
    });

    if (!cancelled) {
      throw new AppError(
        "INVALID_TRANSITION",
        "This order's status changed — refresh and try again.",
        CONFLICT_STATUS,
      );
    }

    const buyer = await userRepository.findById(order.userId);
    if (buyer) {
      const { subject, html } = orderCancelledTemplate({
        orderId,
        total: order.total,
        refunded: refundOutcome?.succeeded ?? false,
      });
      void sendEmail({
        to: buyer.email,
        subject,
        body: `Order ${orderId} has been cancelled.`,
        html,
      });
    }

    if (refundOutcome && !refundOutcome.succeeded) {
      const { subject, html } = refundFailedTemplate({ orderId, total: order.total });
      void sendEmail({
        to: env.OPS_NOTIFICATION_EMAIL,
        subject,
        body: `Order ${orderId} needs a manual refund — automatic refund failed.`,
        html,
      });
    }

    const actorDescription =
      actor.type === "ADMIN" ? `admin ${actor.adminUserId}` : `buyer ${actor.userId}`;
    logger.info(`Order ${orderId} cancelled by ${actorDescription}: ${reason}`);
  },

  async listMineAsBrand(
    userId: string,
    { cursor, limit }: ListBrandOrdersQuery,
  ): Promise<{ items: BrandOrderItemView[]; nextCursor: string | null }> {
    const brandId = await requireBrandId(userId);
    const rows = await orderRepository.listItemsForBrand(brandId, { cursor, limit });

    const { items: pagedRows, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);
    return { items: pagedRows.map(toBrandOrderItemView), nextCursor };
  },
};
