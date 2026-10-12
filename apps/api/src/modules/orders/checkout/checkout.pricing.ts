import { PaymentMethod } from "#generated/prisma/enums.js";
import { couponService } from "#modules/coupons/coupon.service.js";
import { buildCouponLinesForPricedLines } from "#modules/coupons/redemption/redemption.service.js";
import { deliveryZoneService } from "#modules/delivery-zones/delivery-zone.service.js";
import {
  assertOrderMoneyInvariant,
  resolveBrandFundedUnitPrice,
  toActiveBrandDiscount,
} from "#modules/discounts/discount.utils.js";
import { productRepository } from "#modules/products/product.repository.js";

import type { CheckoutLine, CheckoutPricing } from "./checkout.types.js";

type PriceCheckoutInput = {
  userId: string;
  lines: CheckoutLine[];
  paymentMethod: PaymentMethod;
  city: string;
  couponCode: string | undefined;
  orderPlacedAt: Date;
};

export const priceCheckout = async ({
  userId,
  lines,
  paymentMethod,
  city,
  couponCode,
  orderPlacedAt,
}: PriceCheckoutInput): Promise<CheckoutPricing> => {
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

  return {
    pricedLines,
    couponResolution,
    subtotal,
    brandDiscountTotal,
    platformDiscountTotal,
    deliveryFee,
    codFee,
    total,
  };
};
