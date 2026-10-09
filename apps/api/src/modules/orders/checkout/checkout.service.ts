import { randomUUID } from "node:crypto";

import { env } from "#config/env.config.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  newOrderNotificationTemplate,
  orderConfirmationTemplate,
} from "#email-templates/templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import {
  CommissionScope,
  CommissionSource,
  InventoryMovementKind,
  InventoryMovementSource,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionStatus,
  ProductStatus,
} from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import { withIdempotency } from "#lib/idempotency.utils.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { brandPayoutRepository } from "#modules/brand-payouts/brand-payout.repository.js";
import {
  computeGatewayFee,
  computeTieredPlatformFee,
} from "#modules/brand-payouts/brand-payout.utils.js";
import { cartRepository } from "#modules/cart/cart.repository.js";
import { commissionRepository } from "#modules/commissions/commission.repository.js";
import { couponRepository } from "#modules/coupons/coupon.repository.js";
import { buildCouponLinesForPricedLines, couponService } from "#modules/coupons/coupon.service.js";
import { creatorLinkRepository } from "#modules/creator-links/creator-link.repository.js";
import { deliveryZoneService } from "#modules/delivery-zones/delivery-zone.service.js";
import {
  assertOrderMoneyInvariant,
  resolveBrandFundedUnitPrice,
  toActiveBrandDiscount,
} from "#modules/discounts/discount.utils.js";
import { productRepository } from "#modules/products/product.repository.js";
import { productService } from "#modules/products/product.service.js";
import { userRepository } from "#modules/users/user.repository.js";

import { orderFulfilmentGroupRepository } from "../fulfilment-groups/fulfilment-group.repository.js";
import {
  resolveAttribution,
  resolveCommissionShares,
  toCommissionClickReference,
} from "../order.attribution.utils.js";
import { orderRepository } from "../order.repository.js";
import type { CheckoutBody } from "../order.schemas.js";
import type { CreateOrderItemInput } from "../order.types.js";
import { type OrderView } from "../order.types.js";
import { toOrderView } from "../order.utils.js";

const CHECKOUT_ENDPOINT = "orders.checkout";
const CART_EMPTY_STATUS = HTTP_STATUS.BAD_REQUEST;
const ITEMS_UNAVAILABLE_STATUS = HTTP_STATUS.CONFLICT;

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

const checkoutOnce = async (
  userId: string,
  userEmail: string,
  body: CheckoutBody,
): Promise<OrderView> => {
  const { fullName, phone, address, city, landmark, paymentMethod, sessionId, buyNow, couponCode } =
    body;

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
      throw new AppError(
        "NOT_FOUND",
        "This product is no longer available.",
        HTTP_STATUS.NOT_FOUND,
      );
    }
    const ownedSizeIds = await productRepository.findSizeIdsForProduct(buyNow.productId, [
      buyNow.sizeId,
    ]);
    if (ownedSizeIds.length === 0) {
      throw new AppError("NOT_FOUND", "This size is no longer available.", HTTP_STATUS.NOT_FOUND);
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

  const resolvedCouponCode = buyNow ? couponCode : (appliedCouponCode ?? undefined);
  const couponResolution = resolvedCouponCode
    ? await couponService.resolveForContext(resolvedCouponCode, {
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
    pricedLines.map((line, index) => {
      const attribution = attributions[index];
      if (!attribution) return Promise.resolve(null);
      const scope =
        attribution.source === CommissionSource.OUTFIT_BUILD
          ? CommissionScope.OUTFIT_BUILD
          : CommissionScope.CREATOR_LOOK;
      return commissionRepository.findTierForPrice(line.unitPrice, scope);
    }),
  );
  const commissionSharesByLine = await Promise.all(
    attributions.map((attribution, index) => {
      const tier = tiers[index];
      return attribution && tier
        ? resolveCommissionShares(attribution, tier, userId)
        : Promise.resolve([]);
    }),
  );

  const items: CreateOrderItemInput[] = pricedLines.map((line, index) => {
    const { brandId: _brandId, ...orderItemLine } = line;
    const attribution = attributions[index];
    if (!attribution) return { ...orderItemLine, attributionSource: undefined };

    if (attribution.source === CommissionSource.OUTFIT_BUILD) {
      const { outfitId, outfitVersion } = attribution;
      return {
        ...orderItemLine,
        attributedOutfitId: outfitId,
        attributedOutfitVersion: outfitVersion,
        attributionSource: attribution.source,
      };
    }

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
      HTTP_STATUS.SERVICE_UNAVAILABLE,
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
  const orderId = randomUUID();

  const order = await prisma.$transaction(async (tx) => {
    if (paymentMethod === PaymentMethod.COD) {
      const insufficientSizeIds = await productService.decrementStockForItems(
        tx,
        lines.map(({ sizeId, qty }) => ({ sizeId, qty })),
        {
          kind: InventoryMovementKind.ORDER_COMMIT,
          sourceType: InventoryMovementSource.ORDER,
          sourceId: orderId,
        },
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
      const claimed = await couponRepository.claimBudget(
        tx,
        couponResolution.coupon.id,
        platformDiscountTotal,
      );
      if (!claimed) {
        throw new AppError(
          "COUPON_EXHAUSTED",
          "This coupon has reached its limit.",
          HTTP_STATUS.CONFLICT,
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
            HTTP_STATUS.CONFLICT,
          );
        }
        throw error;
      }
    }

    const fulfilmentGroups = await orderFulfilmentGroupRepository.createFulfilmentGroups(
      tx,
      createdOrder.id,
      distinctBrandIds,
    );
    const fulfilmentGroupIdByBrandId = new Map(
      fulfilmentGroups.map((group) => [group.brandId, group.id]),
    );
    for (const brandId of distinctBrandIds) {
      const fulfilmentGroupId = fulfilmentGroupIdByBrandId.get(brandId);
      if (!fulfilmentGroupId) continue;
      const itemIdsForBrand = createdOrder.items
        .filter((_, index) => pricedLines[index]?.brandId === brandId)
        .map((orderItem) => orderItem.id);
      await orderFulfilmentGroupRepository.assignItemsToFulfilmentGroup(
        tx,
        fulfilmentGroupId,
        itemIdsForBrand,
      );
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
          netAmount: grossAmount - platformFee,
        });
      }

      const attribution = attributions[index];
      const tier = tiers[index];
      if (!attribution || !tier) continue;

      const clickReference = toCommissionClickReference(attribution);
      for (const share of commissionSharesByLine[index] ?? []) {
        await commissionRepository.createPending(tx, {
          ...share,
          ...clickReference,
          orderItemId: orderItem.id,
          source: attribution.source,
          tierId: tier.id,
        });
        if ("creatorId" in share) {
          createdCommissions.push({
            creatorId: share.creatorId,
            orderItemId: orderItem.id,
            amount: share.amount,
          });
        }
      }
    }

    return createdOrder;
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
