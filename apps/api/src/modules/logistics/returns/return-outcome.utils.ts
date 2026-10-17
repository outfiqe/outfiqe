import {
  BrandIncidentKind,
  OrderRefundCause,
  ParcelReturnOutcome,
} from "#generated/prisma/enums.js";
import type { StaffRefundItemsBody } from "#modules/orders/refunds/refund.schemas.js";

export type ReturnOutcomeRules = {
  refundCause: StaffRefundItemsBody["cause"];
  recordsRefusal: boolean;
  brandIncidentKind: BrandIncidentKind | null;
  opensPartnerClaim: boolean;
};

const RETURN_OUTCOME_RULES: Readonly<Record<ParcelReturnOutcome, ReturnOutcomeRules>> = {
  [ParcelReturnOutcome.CUSTOMER_REFUSED_OR_UNREACHABLE]: {
    refundCause: OrderRefundCause.CUSTOMER_REFUSED,
    recordsRefusal: true,
    brandIncidentKind: null,
    opensPartnerClaim: false,
  },
  [ParcelReturnOutcome.WRONG_OR_DAMAGED_ITEM]: {
    refundCause: OrderRefundCause.HUB_INSPECTION_FAILED,
    recordsRefusal: false,
    brandIncidentKind: BrandIncidentKind.FAILED_INSPECTION,
    opensPartnerClaim: false,
  },
  [ParcelReturnOutcome.PARTNER_DAMAGED_OR_LOST]: {
    refundCause: OrderRefundCause.PARTNER_FAILED,
    recordsRefusal: false,
    brandIncidentKind: null,
    opensPartnerClaim: true,
  },
};

export const resolveReturnOutcome = (outcome: ParcelReturnOutcome): ReturnOutcomeRules =>
  RETURN_OUTCOME_RULES[outcome];

type ParcelItem = { id: string; qty: number; refundedQty: number; unitPrice: number };
type ReturnLine = { orderItemId: string; resellableQty: number; damagedQty: number };

const NO_UNITS = 0;

export const unitsStillInParcel = ({ qty, refundedQty }: Pick<ParcelItem, "qty" | "refundedQty">) =>
  Math.max(qty - refundedQty, NO_UNITS);

export const isReturnGradingComplete = (
  parcelItems: readonly ParcelItem[],
  lines: readonly ReturnLine[],
): boolean => {
  const itemsStillInParcel = parcelItems.filter((item) => unitsStillInParcel(item) > NO_UNITS);
  const linesByItemId = new Map(lines.map((line) => [line.orderItemId, line]));
  return (
    linesByItemId.size === lines.length &&
    lines.length === itemsStillInParcel.length &&
    itemsStillInParcel.every((item) => {
      const line = linesByItemId.get(item.id);
      return (
        line !== undefined && line.resellableQty + line.damagedQty === unitsStillInParcel(item)
      );
    })
  );
};

export const calculateGoodsStillInParcel = (parcelItems: readonly ParcelItem[]): number =>
  parcelItems.reduce(
    (goodsValue, item) => goodsValue + unitsStillInParcel(item) * item.unitPrice,
    NO_UNITS,
  );
