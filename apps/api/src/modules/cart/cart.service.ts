import { AppError } from "#middlewares/error-handler.js";
import { couponService } from "#modules/coupons/coupon.service.js";
import type { CouponLine } from "#modules/coupons/coupon.types.js";
import { deliveryZoneService } from "#modules/delivery-zones/deliveryZone.service.js";
import {
  computeDiscountPercent,
  resolveBrandFundedUnitPrice,
  toActiveBrandDiscount,
} from "#modules/discounts/discount.utils.js";
import { productRepository } from "#modules/products/product.repository.js";

import { CART_LOW_STOCK_THRESHOLD } from "./cart.constants.js";
import { cartRepository } from "./cart.repository.js";
import type { AppliedCouponView, CartItemView, CartView } from "./cart.types.js";

const NOT_FOUND_STATUS = 404;

const buildCartLines = async (
  cartId: string,
): Promise<{ items: CartItemView[]; couponLines: CouponLine[] }> => {
  const rows = await cartRepository.listItems(cartId);
  const productIds = [...new Set(rows.map((row) => row.productId))];
  const [stockBySizeId, activeDiscountsByProductId, eligibilityAttributesByProductId] =
    await Promise.all([
      productRepository.getStockBySizeIds(rows.map((row) => row.sizeId)),
      productRepository.findActiveDiscountsByProductIds(productIds, new Date()),
      productRepository.findEligibilityAttributesByIds(productIds),
    ]);

  const items: CartItemView[] = [];
  const couponLines: CouponLine[] = [];

  for (const row of rows) {
    const { id, productId, sizeId, qty, product, size } = row;
    const { name: productName, price: listUnitPrice, imageUrl, brand } = product;
    const availableStock = stockBySizeId.get(sizeId) ?? 0;
    const soldOut = availableStock === 0;
    const activeDiscount = activeDiscountsByProductId.get(productId);
    const unitPrice = resolveBrandFundedUnitPrice(
      listUnitPrice,
      toActiveBrandDiscount(activeDiscount),
    );

    items.push({
      id,
      productId,
      sizeId,
      productName,
      brandName: brand.name,
      imageUrl,
      sizeLabel: size.label,
      unitPrice,
      listUnitPrice,
      discountPercent: computeDiscountPercent(listUnitPrice, unitPrice),
      qty,
      availableStock,
      soldOut,
      lowStock: availableStock > 0 && availableStock <= CART_LOW_STOCK_THRESHOLD,
    });

    if (soldOut) continue;
    const eligibilityAttributes = eligibilityAttributesByProductId.get(productId);
    if (!eligibilityAttributes) continue;
    couponLines.push({
      lineId: id,
      productId,
      brandId: eligibilityAttributes.brandId,
      productTypeId: eligibilityAttributes.productTypeId,
      categoryIds: eligibilityAttributes.categoryIds,
      eligibleAmount: unitPrice * qty,
      hasBrandDiscount: Boolean(activeDiscount),
    });
  }

  return { items, couponLines };
};

const previewCoupon = async (
  code: string,
  userId: string,
  couponLines: CouponLine[],
): Promise<AppliedCouponView | null> => {
  try {
    const { coupon, valuation } = await couponService.resolveForContext(code, {
      userId,
      paymentMethod: undefined,
      lines: couponLines,
      at: new Date(),
    });
    return {
      code: coupon.code,
      discountAmount: valuation.discountAmount,
      prepaidOnly: coupon.prepaidOnly,
    };
  } catch {
    return null;
  }
};

const buildCartView = async (
  cartId: string,
  city: string | null,
  appliedCouponCode: string | null,
  userId: string,
): Promise<CartView> => {
  const { items, couponLines } = await buildCartLines(cartId);

  const subtotal = items.reduce(
    (sum, item) => (item.soldOut ? sum : sum + item.unitPrice * item.qty),
    0,
  );

  const appliedCoupon = appliedCouponCode
    ? await previewCoupon(appliedCouponCode, userId, couponLines)
    : null;
  const platformDiscountTotal = appliedCoupon?.discountAmount ?? 0;

  const feeValues = await deliveryZoneService.resolveFeeValuesForCity(city);
  const deliveryFee =
    subtotal === 0 || subtotal >= feeValues.freeDeliveryThreshold
      ? 0
      : feeValues.standardDeliveryFee;

  return {
    items,
    itemCount: items.reduce((sum, item) => (item.soldOut ? sum : sum + item.qty), 0),
    subtotal,
    deliveryFee,
    platformDiscountTotal,
    total: subtotal - platformDiscountTotal + deliveryFee,
    city,
    appliedCoupon,
  };
};

export const cartService = {
  async getCart(userId: string): Promise<CartView> {
    const { id: cartId, city, appliedCouponCode } = await cartRepository.getOrCreateCart(userId);
    return buildCartView(cartId, city, appliedCouponCode, userId);
  },

  async addItem(userId: string, productId: string, sizeId: string, qty: number): Promise<CartView> {
    const { id: cartId, city, appliedCouponCode } = await cartRepository.getOrCreateCart(userId);
    const [existing, stockBySizeId] = await Promise.all([
      cartRepository.findItemBySizeId(cartId, sizeId),
      productRepository.getStockBySizeIds([sizeId]),
    ]);

    const availableStock = stockBySizeId.get(sizeId) ?? 0;
    const clampedQty = Math.min((existing?.qty ?? 0) + qty, availableStock);

    if (clampedQty <= 0) {
      if (existing) await cartRepository.removeItem(cartId, existing.id);
    } else {
      await cartRepository.upsertItem(cartId, productId, sizeId, clampedQty);
    }

    return buildCartView(cartId, city, appliedCouponCode, userId);
  },

  async updateItemQty(userId: string, cartItemId: string, qty: number): Promise<CartView> {
    const { id: cartId, city, appliedCouponCode } = await cartRepository.getOrCreateCart(userId);

    if (qty <= 0) {
      await cartRepository.removeItem(cartId, cartItemId);
      return buildCartView(cartId, city, appliedCouponCode, userId);
    }

    const item = await cartRepository.findItemById(cartId, cartItemId);
    if (!item) throw new AppError("NOT_FOUND", "This item isn't in your bag.", NOT_FOUND_STATUS);

    const stockBySizeId = await productRepository.getStockBySizeIds([item.sizeId]);
    const availableStock = stockBySizeId.get(item.sizeId) ?? 0;
    const clampedQty = Math.min(qty, availableStock);

    if (clampedQty <= 0) {
      await cartRepository.removeItem(cartId, cartItemId);
    } else {
      await cartRepository.updateItemQty(cartId, cartItemId, clampedQty);
    }

    return buildCartView(cartId, city, appliedCouponCode, userId);
  },

  async removeItem(userId: string, cartItemId: string): Promise<CartView> {
    const { id: cartId, city, appliedCouponCode } = await cartRepository.getOrCreateCart(userId);
    await cartRepository.removeItem(cartId, cartItemId);
    return buildCartView(cartId, city, appliedCouponCode, userId);
  },

  async setCity(userId: string, city: string): Promise<CartView> {
    const { id: cartId, appliedCouponCode } = await cartRepository.getOrCreateCart(userId);
    await cartRepository.updateCity(cartId, city);
    return buildCartView(cartId, city, appliedCouponCode, userId);
  },

  async applyCoupon(userId: string, code: string): Promise<CartView> {
    const { id: cartId, city } = await cartRepository.getOrCreateCart(userId);
    const { couponLines } = await buildCartLines(cartId);

    await couponService.resolveForContext(code, {
      userId,
      paymentMethod: undefined,
      lines: couponLines,
      at: new Date(),
    });

    const normalizedCode = code.trim().toUpperCase();
    await cartRepository.updateAppliedCouponCode(cartId, normalizedCode);
    return buildCartView(cartId, city, normalizedCode, userId);
  },

  async removeCoupon(userId: string): Promise<CartView> {
    const { id: cartId, city } = await cartRepository.getOrCreateCart(userId);
    await cartRepository.updateAppliedCouponCode(cartId, null);
    return buildCartView(cartId, city, null, userId);
  },
};
