import { env } from "#config/env.config.js";
import { orderRepository } from "#modules/orders/order.repository.js";
import type { ProductRecord } from "#modules/products/product.types.js";

import type { ResolvedTagReview } from "../creator-look.types.js";
import { creatorLookTagReviewRepository } from "./tag-review.repository.js";
import { resolveTagReviewStatus } from "./tag-review.utils.js";

type ResolvedTag = ResolvedTagReview & { productId: string; brandId: string };

export const resolveTagReviewForProducts = async (
  creatorId: string,
  productIds: string[],
  productsById: Map<string, ProductRecord>,
): Promise<Map<string, ResolvedTag>> => {
  const resolved = new Map<string, ResolvedTag>();
  if (productIds.length === 0) return resolved;

  const brandIds: string[] = [];
  for (const productId of productIds) {
    const brandId = productsById.get(productId)?.brandId;
    if (brandId && !brandIds.includes(brandId)) brandIds.push(brandId);
  }

  const [policies, settledPurchasedProductIds, trustedBrandIds] = await Promise.all([
    creatorLookTagReviewRepository.listBrandTagPolicies(brandIds),
    orderRepository.listSettledPurchasedProductIds(creatorId, productIds),
    creatorLookTagReviewRepository.listTrustedBrandIds(creatorId, brandIds),
  ]);
  const policyByBrandId = new Map(policies.map((policy) => [policy.id, policy]));
  const verifiedBuyerProductIds = new Set(settledPurchasedProductIds);

  for (const productId of productIds) {
    const brandId = productsById.get(productId)?.brandId;
    if (!brandId) continue;
    const policy = policyByBrandId.get(brandId);
    if (!policy) continue;

    resolved.set(productId, {
      productId,
      brandId,
      ...resolveTagReviewStatus({
        featureEnabled: env.TAG_REVIEW_ENABLED,
        brandPolicy: policy.tagReviewPolicy,
        autoApproveVerifiedBuyers: policy.autoApproveVerifiedBuyers,
        isVerifiedBuyer: verifiedBuyerProductIds.has(productId),
        isTrustedCreator: trustedBrandIds.has(brandId),
      }),
    });
  }

  return resolved;
};
