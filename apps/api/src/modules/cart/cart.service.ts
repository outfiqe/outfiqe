import { AppError } from "#middlewares/error-handler.js";
import { productRepository } from "#modules/products/product.repository.js";

import {
  CART_LOW_STOCK_THRESHOLD,
  FREE_DELIVERY_THRESHOLD,
  STANDARD_DELIVERY_FEE,
} from "./cart.constants.js";
import { cartRepository } from "./cart.repository.js";
import type { CartItemView, CartView } from "./cart.types.js";

const NOT_FOUND_STATUS = 404;

const buildCartView = async (cartId: string): Promise<CartView> => {
  const rows = await cartRepository.listItems(cartId);
  const stockBySizeId = await productRepository.getStockBySizeIds(rows.map((row) => row.sizeId));

  const items: CartItemView[] = rows.map((row) => {
    const availableStock = stockBySizeId.get(row.sizeId) ?? 0;
    return {
      id: row.id,
      productId: row.productId,
      sizeId: row.sizeId,
      productName: row.product.name,
      brandName: row.product.brand.name,
      imageUrl: row.product.imageUrl,
      sizeLabel: row.size.label,
      unitPrice: row.product.price,
      qty: row.qty,
      availableStock,
      soldOut: availableStock === 0,
      lowStock: availableStock > 0 && availableStock <= CART_LOW_STOCK_THRESHOLD,
    };
  });

  const subtotal = items.reduce(
    (sum, item) => (item.soldOut ? sum : sum + item.unitPrice * item.qty),
    0,
  );
  const deliveryFee =
    subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;

  return {
    items,
    itemCount: items.reduce((sum, item) => (item.soldOut ? sum : sum + item.qty), 0),
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
  };
};

export const cartService = {
  async getCart(userId: string): Promise<CartView> {
    const cartId = await cartRepository.getOrCreateCartId(userId);
    return buildCartView(cartId);
  },

  async addItem(userId: string, productId: string, sizeId: string, qty: number): Promise<CartView> {
    const cartId = await cartRepository.getOrCreateCartId(userId);
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

    return buildCartView(cartId);
  },

  async updateItemQty(userId: string, cartItemId: string, qty: number): Promise<CartView> {
    const cartId = await cartRepository.getOrCreateCartId(userId);

    if (qty <= 0) {
      await cartRepository.removeItem(cartId, cartItemId);
      return buildCartView(cartId);
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

    return buildCartView(cartId);
  },

  async removeItem(userId: string, cartItemId: string): Promise<CartView> {
    const cartId = await cartRepository.getOrCreateCartId(userId);
    await cartRepository.removeItem(cartId, cartItemId);
    return buildCartView(cartId);
  },
};
