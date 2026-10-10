import { HTTP_STATUS } from "#constants/http.constants.js";
import type { Prisma } from "#generated/prisma/client.js";
import { PaymentMethod } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";
import { brandPayoutRepository } from "#modules/brand-payouts/brand-payout.repository.js";
import {
  computeGatewayFee,
  computeTieredPlatformFee,
} from "#modules/brand-payouts/brand-payout.utils.js";
import { commissionRepository } from "#modules/commissions/commission.repository.js";

import { toCommissionClickReference } from "../order.attribution.utils.js";
import type {
  CheckoutLineAttributions,
  CheckoutSettlementTerms,
  CreatedCreatorCommission,
  PricedCheckoutLine,
} from "./checkout.types.js";

export const loadCheckoutSettlementTerms = async (
  paymentMethod: PaymentMethod,
  distinctBrandIds: string[],
  orderPlacedAt: Date,
): Promise<CheckoutSettlementTerms> => {
  const commissionRule = await brandPayoutRepository.findActiveRuleWithTiers();
  if (!commissionRule) {
    throw new AppError(
      "COMMISSION_RULE_NOT_CONFIGURED",
      "Checkout isn't available right now. Please try again shortly.",
      HTTP_STATUS.SERVICE_UNAVAILABLE,
    );
  }

  const gatewayFeeRate =
    paymentMethod === PaymentMethod.COD
      ? null
      : await brandPayoutRepository.findActiveGatewayFeeRate(paymentMethod);

  const exemptBrandIds = await brandPayoutRepository.findActiveExemptBrandIds(
    distinctBrandIds,
    orderPlacedAt,
  );

  return { commissionRule, gatewayFeeRate, exemptBrandIds };
};

type RecordItemSettlementsInput = {
  orderItems: { id: string }[];
  pricedLines: PricedCheckoutLine[];
  paymentMethod: PaymentMethod;
  settlementTerms: CheckoutSettlementTerms;
  lineAttributions: CheckoutLineAttributions;
};

export const recordItemPayoutsAndCommissions = async (
  tx: Prisma.TransactionClient,
  {
    orderItems,
    pricedLines,
    paymentMethod,
    settlementTerms: { commissionRule, gatewayFeeRate, exemptBrandIds },
    lineAttributions: { attributions, tiers, commissionSharesByLine },
  }: RecordItemSettlementsInput,
): Promise<CreatedCreatorCommission[]> => {
  const createdCommissions: CreatedCreatorCommission[] = [];

  for (const [index, orderItem] of orderItems.entries()) {
    const line = pricedLines[index];
    if (line) {
      const grossAmount = line.unitPrice * line.qty;
      const isExemptBrand = exemptBrandIds.has(line.brandId);
      const { fee: platformFee, tierId: platformCommissionTierId } = isExemptBrand
        ? { fee: 0, tierId: null }
        : computeTieredPlatformFee(grossAmount, commissionRule.tiers);
      const gatewayFee = computeGatewayFee(grossAmount, paymentMethod, gatewayFeeRate);

      await brandPayoutRepository.createPending(tx, {
        orderItemId: orderItem.id,
        brandId: line.brandId,
        commissionRuleId: commissionRule.id,
        platformCommissionTierId,
        grossAmount,
        platformFee,
        gatewayFee,
        netAmount: grossAmount - platformFee,
      });
    }

    const attribution = attributions[index];
    const tier = tiers[index];
    if (!attribution || !tier) continue;

    const clickReference = toCommissionClickReference(attribution);
    for (const share of commissionSharesByLine[index] ?? []) {
      await commissionRepository.createPending(tx, {
        ...share,
        ...clickReference,
        orderItemId: orderItem.id,
        source: attribution.source,
        tierId: tier.id,
      });
      if ("creatorId" in share) {
        createdCommissions.push({
          creatorId: share.creatorId,
          orderItemId: orderItem.id,
          amount: share.amount,
        });
      }
    }
  }

  return createdCommissions;
};
