import type { PaymentMethod } from "#generated/prisma/enums.js";

import type {
  PaymentMethodBreakdown,
  PaymentMethodOrderTotals,
  PaymentMethodPayoutFees,
} from "./financialRollup.types.js";

export const sumStatusBuckets = (
  amountByStatus: Partial<Record<string, number>>,
  statuses: readonly string[],
): number => statuses.reduce((total, status) => total + (amountByStatus[status] ?? 0), 0);

export const buildPaymentMethodBreakdown = (
  orderTotals: PaymentMethodOrderTotals[],
  payoutFees: PaymentMethodPayoutFees[],
): Partial<Record<PaymentMethod, PaymentMethodBreakdown>> => {
  const feesByMethod = new Map(payoutFees.map((row) => [row.paymentMethod, row]));
  const breakdown: Partial<Record<PaymentMethod, PaymentMethodBreakdown>> = {};

  for (const { paymentMethod, total, orderCount } of orderTotals) {
    const fees = feesByMethod.get(paymentMethod);
    const platformFee = fees?.platformFee ?? 0;
    const gatewayFee = fees?.gatewayFee ?? 0;

    breakdown[paymentMethod] = {
      gmv: total,
      orderCount,
      realizedTakeRate: total > 0 ? (platformFee - gatewayFee) / total : 0,
    };
  }

  return breakdown;
};
