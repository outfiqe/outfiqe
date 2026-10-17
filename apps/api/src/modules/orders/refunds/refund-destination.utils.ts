import { PaymentMethod, RefundDestinationKind } from "#generated/prisma/enums.js";

import type { RefundDestinationRecord } from "./refund-destination.repository.js";
import type { RefundDestinationView } from "./refund-destination.types.js";

const SUGGESTED_KIND_BY_PAYMENT_METHOD: Record<PaymentMethod, RefundDestinationKind | null> = {
  [PaymentMethod.KHALTI]: RefundDestinationKind.KHALTI,
  [PaymentMethod.ESEWA]: RefundDestinationKind.ESEWA,
  [PaymentMethod.COD]: null,
};

export const suggestDestinationKind = (
  paymentMethod: PaymentMethod,
): RefundDestinationKind | null => SUGGESTED_KIND_BY_PAYMENT_METHOD[paymentMethod];

export const toRefundDestinationView = (
  destination: RefundDestinationRecord,
): RefundDestinationView => ({
  kind: destination.kind,
  walletId: destination.walletId,
  bankId: destination.bankId,
  bankName: destination.bank?.name ?? null,
  accountName: destination.accountName,
  accountNumberLast4: destination.accountNumberLast4,
  updatedAt: destination.updatedAt.toISOString(),
});
