import {
  computeDiscountPercent,
  resolveBrandFundedUnitPrice,
  toActiveBrandDiscount,
} from "#modules/discounts/discount.utils.js";

import { LOW_STOCK_THRESHOLD, NEW_ARRIVAL_WINDOW_MS } from "./product.constants.js";
import type {
  ProductBrandSummary,
  ProductDiscountRecord,
  ProductDiscountView,
  ProductSuggestion,
  ProductWithBrand,
  ProductWithOptionalStock,
  ProductWithStockSizesAndImages,
  PublicProduct,
} from "./product.types.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string): boolean => UUID_PATTERN.test(value);

export const toDiscountView = (discount: ProductDiscountRecord): ProductDiscountView => ({
  id: discount.id,
  discountType: discount.discountType,
  percentBasisPoints: discount.percentBasisPoints,
  fixedAmount: discount.fixedAmount,
  startsAt: discount.startsAt.toISOString(),
  endsAt: discount.endsAt?.toISOString() ?? null,
});

export const toSuggestion = ({
  id,
  name,
  brand,
  imageUrl,
}: ProductWithBrand): ProductSuggestion => ({
  id,
  name,
  brand: brand.name,
  imageUrl,
});

export const isNew = (createdAt: Date): boolean =>
  Date.now() - createdAt.getTime() <= NEW_ARRIVAL_WINDOW_MS;

export const sumStock = (sizes: { stock: number }[]): number =>
  sizes.reduce((total, size) => total + size.stock, 0);

export const isLowStock = (totalStock: number): boolean =>
  totalStock > 0 && totalStock <= LOW_STOCK_THRESHOLD;

export const toPublicProduct = (product: ProductWithOptionalStock): PublicProduct => {
  const {
    id,
    brand,
    name,
    price,
    productType,
    categories,
    imageUrl,
    totalStock,
    lowStock,
    createdAt,
    creatorBuyerCount,
    unitsSold,
    avgRating,
    reviewCount,
    rating1Count,
    rating2Count,
    rating3Count,
    rating4Count,
    rating5Count,
    discounts,
  } = product;
  const effectivePrice = resolveBrandFundedUnitPrice(price, toActiveBrandDiscount(discounts?.[0]));
  return {
    id,
    brand: brand.name,
    name,
    price,
    effectivePrice,
    discountPercent: computeDiscountPercent(price, effectivePrice),
    type: productType.slug,
    categorySlugs: categories.map((category) => category.slug),
    imageUrl,
    lowStock: totalStock === undefined ? lowStock : isLowStock(totalStock),
    isNew: isNew(createdAt),
    creatorBuyerCount: creatorBuyerCount ?? 0,
    unitsSold: unitsSold ?? 0,
    avgRating,
    reviewCount,
    rating1Count,
    rating2Count,
    rating3Count,
    rating4Count,
    rating5Count,
  };
};

export const toBrandSummary = ({
  categories,
  images,
  brand: _brand,
  productType,
  productTypeId: _productTypeId,
  totalStock,
  lowStock: _lowStock,
  discounts,
  price,
  ...rest
}: ProductWithStockSizesAndImages): ProductBrandSummary => {
  const [activeDiscountRecord] = discounts ?? [];
  return {
    ...rest,
    price,
    effectivePrice: resolveBrandFundedUnitPrice(price, toActiveBrandDiscount(activeDiscountRecord)),
    activeDiscount: activeDiscountRecord ? toDiscountView(activeDiscountRecord) : null,
    type: productType.slug,
    categories: categories.map((category) => category.name),
    categorySlugs: categories.map((category) => category.slug),
    imageUrls: images.map((image) => image.url),
    lowStock: isLowStock(totalStock),
  };
};
