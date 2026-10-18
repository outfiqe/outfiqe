import { prisma } from "#db/prisma.js";
import { PaymentMethod, PaymentStatus } from "#generated/prisma/enums.js";

import { orderNotFoundError } from "./refund.claim.js";
import { remainingNetAmount, remainingUnits } from "./refund.pricing.js";
import { orderRefundRepository } from "./refund.repository.js";

const NOTHING_TO_COLLECT = 0;
const NO_UNITS_LEFT = 0;

type CashToCollectRequest = {
  orderId: string;
  fulfilmentGroupIds: readonly string[];
  includesOrderFees: boolean;
};

export const orderOutstandingAmountService = {
  async calculateCashToCollect({
    orderId,
    fulfilmentGroupIds,
    includesOrderFees,
  }: CashToCollectRequest): Promise<number> {
    const order = await orderRefundRepository.findOrderForRefund(prisma, orderId);
    if (!order) throw orderNotFoundError();
    const isCashStillDue =
      order.paymentMethod === PaymentMethod.COD && order.paymentStatus === PaymentStatus.DUE;
    if (!isCashStillDue) return NOTHING_TO_COLLECT;

    const groupIds = new Set(fulfilmentGroupIds);
    const parcelItems = order.items.filter(
      ({ fulfilmentGroup }) => fulfilmentGroup !== null && groupIds.has(fulfilmentGroup.id),
    );
    const goodsAmount = parcelItems.reduce(
      (sum, item) => sum + remainingNetAmount(item),
      NOTHING_TO_COLLECT,
    );
    const hasGoodsLeft = parcelItems.some((item) => remainingUnits(item) > NO_UNITS_LEFT);
    const orderFees =
      includesOrderFees && hasGoodsLeft ? order.deliveryFee + order.codFee : NOTHING_TO_COLLECT;
    return goodsAmount + orderFees;
  },
};
