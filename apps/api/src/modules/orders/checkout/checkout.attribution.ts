import { CommissionScope, CommissionSource } from "#generated/prisma/enums.js";
import { commissionRepository } from "#modules/commissions/commission.repository.js";

import { resolveAttribution, resolveCommissionShares } from "../order.attribution.utils.js";
import type { CheckoutLineAttributions, PricedCheckoutLine } from "./checkout.types.js";

export const resolveCheckoutAttributions = async (
  userId: string,
  pricedLines: PricedCheckoutLine[],
  orderPlacedAt: Date,
): Promise<CheckoutLineAttributions> => {
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

  return { attributions, tiers, commissionSharesByLine };
};
