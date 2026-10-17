import type { RefundableItem, RefundLineRequest, RefundPricing } from "./refund.types.js";

const NO_UNITS = 0;
const NOTHING = 0;

type ItemAmounts = Pick<RefundableItem, "unitPrice" | "qty" | "platformDiscountAmount">;
type ItemUnits = Pick<RefundableItem, "qty" | "refundedQty">;

export const REFUND_PRICING_PROBLEM = {
  UNKNOWN_ITEM: "UNKNOWN_ITEM",
  TOO_MANY_UNITS: "TOO_MANY_UNITS",
  NO_UNITS: "NO_UNITS",
} as const;

export type RefundPricingProblem =
  (typeof REFUND_PRICING_PROBLEM)[keyof typeof REFUND_PRICING_PROBLEM];

export const lineNetAmount = ({ unitPrice, qty, platformDiscountAmount }: ItemAmounts): number =>
  unitPrice * qty - platformDiscountAmount;

export const proportionalShare = (wholeAmount: number, units: number, totalUnits: number): number =>
  Math.floor((wholeAmount * units) / totalUnits);

const shareForUnits = (
  wholeAmount: number,
  alreadyRefundedUnits: number,
  unitsToRefund: number,
  totalUnits: number,
): number =>
  proportionalShare(wholeAmount, alreadyRefundedUnits + unitsToRefund, totalUnits) -
  proportionalShare(wholeAmount, alreadyRefundedUnits, totalUnits);

export const remainingUnits = ({ qty, refundedQty }: ItemUnits): number => qty - refundedQty;

export const remainingNetAmount = (item: ItemAmounts & ItemUnits): number => {
  const netAmount = lineNetAmount(item);
  return netAmount - proportionalShare(netAmount, item.refundedQty, item.qty);
};

const findPricingProblem = (
  itemsById: ReadonlyMap<string, RefundableItem>,
  lineRequests: readonly RefundLineRequest[],
): RefundPricingProblem | null => {
  if (lineRequests.length === NO_UNITS) return REFUND_PRICING_PROBLEM.NO_UNITS;
  for (const { orderItemId, qty } of lineRequests) {
    const item = itemsById.get(orderItemId);
    if (!item) return REFUND_PRICING_PROBLEM.UNKNOWN_ITEM;
    if (qty <= NO_UNITS) return REFUND_PRICING_PROBLEM.NO_UNITS;
    if (qty > remainingUnits(item)) return REFUND_PRICING_PROBLEM.TOO_MANY_UNITS;
  }
  return null;
};

export const priceRefund = ({
  items,
  lineRequests,
  orderFees,
  refundsOrderFeesWhenEmptied,
}: {
  items: readonly RefundableItem[];
  lineRequests: readonly RefundLineRequest[];
  orderFees: { deliveryFee: number; codFee: number };
  refundsOrderFeesWhenEmptied: boolean;
}): { problem: RefundPricingProblem } | { pricing: RefundPricing } => {
  const itemsById = new Map(items.map((item) => [item.orderItemId, item]));
  const problem = findPricingProblem(itemsById, lineRequests);
  if (problem) return { problem };

  const lines = lineRequests.flatMap(({ orderItemId, qty }) => {
    const item = itemsById.get(orderItemId);
    if (!item) return [];
    return [
      {
        orderItemId,
        qty,
        amount: shareForUnits(lineNetAmount(item), item.refundedQty, qty, item.qty),
        couponShare: shareForUnits(item.platformDiscountAmount, item.refundedQty, qty, item.qty),
      },
    ];
  });

  const refundedUnitsByItemId = new Map(lines.map((line) => [line.orderItemId, line.qty]));
  const emptiesOrder = items.every(
    (item) => remainingUnits(item) === (refundedUnitsByItemId.get(item.orderItemId) ?? NO_UNITS),
  );
  const goodsAmount = lines.reduce((sum, line) => sum + line.amount, NOTHING);
  const feeAmount =
    emptiesOrder && refundsOrderFeesWhenEmptied
      ? orderFees.deliveryFee + orderFees.codFee
      : NOTHING;

  return {
    pricing: { lines, goodsAmount, feeAmount, totalAmount: goodsAmount + feeAmount, emptiesOrder },
  };
};
