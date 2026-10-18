import { addDays } from "date-fns/addDays";
import { isBefore } from "date-fns/isBefore";

import type {
  CodRemittanceDetailRecord,
  CodRemittanceSummaryRecord,
  PartnerCashRow,
  UnremittedParcelRecord,
} from "./cod.repository.js";
import type {
  CodPartnerSummaryView,
  CodRemittanceDetailView,
  CodRemittanceSummaryView,
  UnremittedParcelView,
} from "./cod.types.js";

export const toCodPartnerSummaryView = ({
  oldestDeliveredAt,
  ...partnerCash
}: PartnerCashRow): CodPartnerSummaryView => ({
  ...partnerCash,
  oldestDeliveredAt: oldestDeliveredAt.toISOString(),
});

export const toUnremittedParcelView = (
  {
    id,
    trackingCode,
    orderId,
    currency,
    codAmountToCollect,
    codCollectedAmount,
    deliveredAt,
    bookings,
  }: UnremittedParcelRecord,
  { codRemittanceDays, now }: { codRemittanceDays: number; now: Date },
): UnremittedParcelView | null => {
  if (deliveredAt === null || codCollectedAmount === null) return null;
  const [booking] = bookings;
  const remitBy = addDays(deliveredAt, codRemittanceDays);
  return {
    shipmentId: id,
    trackingCode,
    orderId,
    currency,
    partnerReference: booking?.partnerReference ?? null,
    quotedPartnerFee: booking?.partnerFee ?? null,
    expectedAmount: codAmountToCollect,
    collectedAmount: codCollectedAmount,
    hasCashMismatch: codCollectedAmount !== codAmountToCollect,
    deliveredAt: deliveredAt.toISOString(),
    remitBy: remitBy.toISOString(),
    isOverdue: isBefore(remitBy, now),
  };
};

export const toCodRemittanceSummaryView = ({
  partner,
  recordedBy,
  receivedAt,
  createdAt,
  _count,
  ...remittance
}: CodRemittanceSummaryRecord): CodRemittanceSummaryView => ({
  ...remittance,
  partnerName: partner.name,
  receivedAt: receivedAt.toISOString(),
  parcelCount: _count.lines,
  recordedByName: recordedBy?.name ?? null,
  createdAt: createdAt.toISOString(),
});

export const toCodRemittanceDetailView = ({
  note,
  lines,
  ...remittance
}: CodRemittanceDetailRecord): CodRemittanceDetailView => ({
  ...toCodRemittanceSummaryView(remittance),
  note,
  lines: lines.map(({ shipment, ...line }) => ({ ...line, ...shipment })),
});
