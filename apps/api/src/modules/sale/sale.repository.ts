import { prisma } from "#db/prisma.js";
import { AccountStatus, ProductStatus, TagReviewStatus } from "#generated/prisma/enums.js";
import {
  computeDiscountPercent,
  resolveBrandFundedUnitPrice,
  toActiveBrandDiscount,
} from "#modules/discounts/discount.utils.js";
import { withActiveDiscount } from "#modules/products/product.repository.js";

import { PURCHASE_HISTORY_LOOKUP_LIMIT, VIEWER_SIGNAL_LOOKBACK_LIMIT } from "./sale.constants.js";
import type { AffinitySignal, SaleCandidate, ViewerShoppingSignals } from "./sale.types.js";

const productAffinitySelect = {
  select: { brandId: true, productTypeId: true, categories: { select: { id: true } } },
} as const;

const toAffinitySignal = (
  source: AffinitySignal["source"],
  product: { brandId: string; productTypeId: string; categories: { id: string }[] },
): AffinitySignal => ({
  source,
  categoryIds: product.categories.map((category) => category.id),
  productTypeId: product.productTypeId,
  brandId: product.brandId,
});

export const saleRepository = {
  async listActiveDiscountCandidates(): Promise<Omit<SaleCandidate, "trendingScoreRaw">[]> {
    const activeDiscount = withActiveDiscount();

    const products = await prisma.product.findMany({
      where: {
        status: ProductStatus.APPROVED,
        deletedAt: null,
        brand: { accountStatus: AccountStatus.ACTIVE },
        sizes: { some: { stock: { gt: 0 } } },
        discounts: { some: activeDiscount.discounts.where },
      },
      select: {
        id: true,
        brandId: true,
        price: true,
        productTypeId: true,
        categories: { select: { id: true } },
        ...activeDiscount,
      },
    });

    const candidates: Omit<SaleCandidate, "trendingScoreRaw">[] = [];
    for (const product of products) {
      const activeDiscountRecord = product.discounts[0];
      if (!activeDiscountRecord) continue;

      const effectivePrice = resolveBrandFundedUnitPrice(
        product.price,
        toActiveBrandDiscount(activeDiscountRecord),
      );
      const discountPercent = computeDiscountPercent(product.price, effectivePrice);
      if (discountPercent === null) continue;

      candidates.push({
        productId: product.id,
        brandId: product.brandId,
        categoryIds: product.categories.map((category) => category.id),
        productTypeId: product.productTypeId,
        discountPercent,
        discountStartsAt: activeDiscountRecord.startsAt,
      });
    }
    return candidates;
  },

  async listViewerShoppingSignals(userId: string): Promise<ViewerShoppingSignals> {
    const [savedRows, cartRows, orderRows, likedTagRows] = await Promise.all([
      prisma.savedProduct.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: VIEWER_SIGNAL_LOOKBACK_LIMIT,
        select: { product: productAffinitySelect },
      }),
      prisma.cartItem.findMany({
        where: { cart: { userId } },
        orderBy: { createdAt: "desc" },
        take: VIEWER_SIGNAL_LOOKBACK_LIMIT,
        select: { product: productAffinitySelect },
      }),
      prisma.orderItem.findMany({
        where: { order: { userId } },
        orderBy: { createdAt: "desc" },
        take: PURCHASE_HISTORY_LOOKUP_LIMIT,
        select: { productId: true, product: productAffinitySelect },
      }),
      prisma.creatorLookProduct.findMany({
        where: {
          reviewStatus: TagReviewStatus.APPROVED,
          creatorLook: { likes: { some: { userId } } },
        },
        orderBy: { submittedAt: "desc" },
        take: VIEWER_SIGNAL_LOOKBACK_LIMIT,
        select: { product: productAffinitySelect },
      }),
    ]);

    const signals: AffinitySignal[] = [
      ...savedRows.map((row) => toAffinitySignal("saved", row.product)),
      ...cartRows.map((row) => toAffinitySignal("cart", row.product)),
      ...orderRows
        .slice(0, VIEWER_SIGNAL_LOOKBACK_LIMIT)
        .map((row) => toAffinitySignal("purchase", row.product)),
      ...likedTagRows.map((row) => toAffinitySignal("likedTag", row.product)),
    ];

    return { signals, purchasedProductIds: orderRows.map((row) => row.productId) };
  },
};
