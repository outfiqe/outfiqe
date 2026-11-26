import {
  type OrderRefundCause,
  OrderRefundMethod,
  OrderRefundStatus,
} from "#generated/prisma/enums.js";

import type { OrderRefundSummaryView } from "../order.types.js";

const NOTHING = 0;

export type OrderRefundSummaryRow = {
  cause: OrderRefundCause;
  status: OrderRefundStatus;
  method: OrderRefundMethod | null;
  totalAmount: number;
  lines: { qty: number }[];
};

const sumAmounts = (refunds: readonly OrderRefundSummaryRow[]): number =>
  refunds.reduce((sum, { totalAmount }) => sum + totalAmount, NOTHING);

export const summariseOrderRefunds = (
  refunds: readonly OrderRefundSummaryRow[],
  hasRefundDestination: boolean,
): OrderRefundSummaryView => {
  const offCashPaymentRefunds = refunds.filter(
    ({ method }) => method === OrderRefundMethod.CASH_NOT_COLLECTED,
  );
  const moneyBackRefunds = refunds.filter(
    ({ method }) => method !== OrderRefundMethod.CASH_NOT_COLLECTED,
  );
  const refundsAwaitingDetails = hasRefundDestination
    ? []
    : moneyBackRefunds.filter(({ status }) => status === OrderRefundStatus.NEEDS_MANUAL);

  return {
    cancelledUnitCount: refunds.reduce(
      (unitCount, { lines }) => unitCount + lines.reduce((sum, { qty }) => sum + qty, NOTHING),
      NOTHING,
    ),
    causes: [...new Set(refunds.map(({ cause }) => cause))],
    amountOffCashPayment: sumAmounts(offCashPaymentRefunds),
    amountRefunded: sumAmounts(
      moneyBackRefunds.filter(({ status }) => status === OrderRefundStatus.SUCCEEDED),
    ),
    amountComingBack: sumAmounts(
      moneyBackRefunds.filter(({ status }) => status !== OrderRefundStatus.SUCCEEDED),
    ),
    amountAwaitingDetails: sumAmounts(refundsAwaitingDetails),
  };
};
