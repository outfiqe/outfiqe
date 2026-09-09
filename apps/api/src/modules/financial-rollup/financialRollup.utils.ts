import type { PaymentMethod } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";

import type {
  AttributionCounts,
  AttributionView,
  LedgerRow,
  PaymentMethodBreakdown,
  PaymentMethodOrderTotals,
  PaymentMethodPayoutFees,
} from "./financialRollup.types.js";

export const sumStatusBuckets = (
  amountByStatus: Partial<Record<string, number>>,
  statuses: readonly string[],
): number => statuses.reduce((total, status) => total + (amountByStatus[status] ?? 0), 0);

export type LedgerCursor = { createdAt: Date; orderItemId: string };

export const encodeLedgerCursor = ({ createdAt, orderItemId }: LedgerCursor): string =>
  Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), orderItemId })).toString(
    "base64url",
  );

export const decodeLedgerCursor = (cursor: string): LedgerCursor => {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      createdAt: string;
      orderItemId: string;
    };
    const createdAt = new Date(decoded.createdAt);
    if (!decoded.orderItemId || Number.isNaN(createdAt.getTime())) {
      throw new Error("malformed cursor payload");
    }
    return { createdAt, orderItemId: decoded.orderItemId };
  } catch {
    throw new AppError("INVALID_LEDGER_CURSOR", "That page reference is invalid.", 400);
  }
};

const LEDGER_CSV_HEADERS = [
  "Order ID",
  "Order Item ID",
  "Date",
  "Payment Method",
  "Gross",
  "Platform Fee",
  "Gateway Fee",
  "Creator Commission",
  "Brand Net",
  "Brand Payout Status",
];

const csvField = (value: string | number | null): string => {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toLedgerCsv = (rows: LedgerRow[]): string => {
  const lines = [LEDGER_CSV_HEADERS.map(csvField).join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.orderId,
        row.orderItemId,
        row.createdAt.toISOString(),
        row.paymentMethod,
        row.grossAmount,
        row.platformFee,
        row.gatewayFee,
        row.creatorCommissionAmount,
        row.brandNetAmount,
        row.brandPayoutStatus,
      ]
        .map(csvField)
        .join(","),
    );
  }

  return lines.join("\r\n");
};

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

export const buildAttributionView = ({
  totalItems,
  attributedItems,
}: AttributionCounts): AttributionView => ({
  totalItems,
  attributedItems,
  attributedShare: totalItems > 0 ? attributedItems / totalItems : 0,
});
