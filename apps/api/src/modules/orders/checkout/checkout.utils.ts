import { CommissionSource } from "#generated/prisma/enums.js";

import type { CreateOrderItemInput } from "../order.types.js";
import type { CheckoutLineAttributions, PricedCheckoutLine } from "./checkout.types.js";

export const toAttributedOrderItems = (
  pricedLines: PricedCheckoutLine[],
  attributions: CheckoutLineAttributions["attributions"],
): CreateOrderItemInput[] =>
  pricedLines.map((line, index) => {
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
