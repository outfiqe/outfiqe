import { AppError } from "#middlewares/error-handler.js";
import { deliveryZoneService } from "#modules/delivery-zones/deliveryZone.service.js";
import {
  computeDiscountPercent,
  resolveBrandFundedUnitPrice,
  toActiveBrandDiscount,
} from "#modules/discounts/discount.utils.js";
import { productRepository } from "#modules/products/product.repository.js";

import { CART_LOW_STOCK_THRESHOLD } from "./cart.constants.js";
import { cartRepository } from "./cart.repository.js";
import type { CartItemView, CartView } from "./cart.types.js";

const NOT_FOUND_STATUS = 404;

const buildCartView = async (cartId: string, city: string | null): Promise<CartView> => {
  const rows = await cartRepository.listItems(cartId);
  const [stockBySizeId, activeDiscountsByProductId] = await Promise.all([
    productRepository.getStockBySizeIds(rows.map((row) => row.sizeId)),
    productRepository.findActiveDiscountsByProductIds(
      [...new Set(rows.map((row) => row.productId))],
      new Date(),
    ),
  ]);

  const items: CartItemView[] = rows.map((row) => {
    const { id, productId, sizeId, qty, product, size } = row;
    const { name: productName, price: listUnitPrice, imageUrl, brand } = product;
    const availableStock = stockBySizeId.get(sizeId) ?? 0;
    const activeDiscount = activeDiscountsByProductId.get(productId);
    const unitPrice = resolveBrandFundedUnitPrice(
      listUnitPrice,
      toActiveBrandDiscount(activeDiscount),
    );

    return {
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
      soldOut: availableStock === 0,
      lowStock: availableStock > 0 && availableStock <= CART_LOW_STOCK_THRESHOLD,
    };
  });

  const subtotal = items.reduce(
    (sum, item) => (item.soldOut ? sum : sum + item.unitPrice * item.qty),
    0,
  );
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
    total: subtotal + deliveryFee,
    city,
  };
};

export const cartService = {
  async getCart(userId: string): Promise<CartView> {
    const { id: cartId, city } = await cartRepository.getOrCreateCart(userId);
    return buildCartView(cartId, city);
  },

  async addItem(userId: string, productId: string, sizeId: string, qty: number): Promise<CartView> {
    const { id: cartId, city } = await cartRepository.getOrCreateCart(userId);
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

    return buildCartView(cartId, city);
  },

  async updateItemQty(userId: string, cartItemId: string, qty: number): Promise<CartView> {
    const { id: cartId, city } = await cartRepository.getOrCreateCart(userId);

    if (qty <= 0) {
      await cartRepository.removeItem(cartId, cartItemId);
      return buildCartView(cartId, city);
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

    return buildCartView(cartId, city);
  },

  async removeItem(userId: string, cartItemId: string): Promise<CartView> {
    const { id: cartId, city } = await cartRepository.getOrCreateCart(userId);
    await cartRepository.removeItem(cartId, cartItemId);
    return buildCartView(cartId, city);
  },

  async setCity(userId: string, city: string): Promise<CartView> {
    const { id: cartId } = await cartRepository.getOrCreateCart(userId);
    await cartRepository.updateCity(cartId, city);
    return buildCartView(cartId, city);
  },
};
