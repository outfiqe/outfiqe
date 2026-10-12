import { HTTP_STATUS } from "#constants/http.constants.js";
import { ProductStatus } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";
import { cartRepository } from "#modules/cart/cart.repository.js";
import { productRepository } from "#modules/products/product.repository.js";

import type { CheckoutBody } from "../order.schemas.js";
import { CART_EMPTY_STATUS, ITEMS_UNAVAILABLE_STATUS } from "./checkout.constants.js";
import type { CheckoutLine } from "./checkout.types.js";

const loadBuyNowLine = async (
  buyNow: NonNullable<CheckoutBody["buyNow"]>,
): Promise<CheckoutLine[]> => {
  const product = await productRepository.findById(buyNow.productId);
  if (!product || product.status !== ProductStatus.APPROVED || product.deletedAt) {
    throw new AppError("NOT_FOUND", "This product is no longer available.", HTTP_STATUS.NOT_FOUND);
  }
  const ownedSizeIds = await productRepository.findSizeIdsForProduct(buyNow.productId, [
    buyNow.sizeId,
  ]);
  if (ownedSizeIds.length === 0) {
    throw new AppError("NOT_FOUND", "This size is no longer available.", HTTP_STATUS.NOT_FOUND);
  }
  return [
    {
      productId: buyNow.productId,
      sizeId: buyNow.sizeId,
      qty: buyNow.qty,
      listUnitPrice: product.price,
      brandId: product.brandId,
    },
  ];
};

const loadCartLines = async (cartId: string): Promise<CheckoutLine[]> => {
  const cartRows = await cartRepository.listItems(cartId);
  if (cartRows.length === 0) {
    throw new AppError("CART_EMPTY", "Your bag is empty.", CART_EMPTY_STATUS);
  }
  return cartRows.map(({ productId, sizeId, qty, product }) => ({
    productId,
    sizeId,
    qty,
    listUnitPrice: product.price,
    brandId: product.brandId,
  }));
};

export const loadCheckoutLines = (
  cartId: string,
  buyNow: CheckoutBody["buyNow"],
): Promise<CheckoutLine[]> => (buyNow ? loadBuyNowLine(buyNow) : loadCartLines(cartId));

export const assertCheckoutLinesInStock = async (
  lines: CheckoutLine[],
  isBuyNow: boolean,
): Promise<void> => {
  const stockBySizeId = await productRepository.getStockBySizeIds(lines.map((line) => line.sizeId));
  const unavailable = lines.filter((line) => (stockBySizeId.get(line.sizeId) ?? 0) < line.qty);
  if (unavailable.length > 0) {
    throw new AppError(
      "ITEMS_UNAVAILABLE",
      isBuyNow
        ? "This item is no longer available."
        : "Some items in your bag are no longer available.",
      ITEMS_UNAVAILABLE_STATUS,
      { sizeIds: unavailable.map((line) => line.sizeId) },
    );
  }
};
