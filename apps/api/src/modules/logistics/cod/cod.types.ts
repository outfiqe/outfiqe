export type CodPartnerSummaryView = {
  partnerId: string;
  partnerName: string;
  currency: string;
  codRemittanceDays: number;
  unremittedParcelCount: number;
  unremittedAmount: number;
  overdueParcelCount: number;
  overdueAmount: number;
  oldestDeliveredAt: string;
};

export type UnremittedParcelView = {
  shipmentId: string;
  trackingCode: string;
  orderId: string;
  currency: string;
  partnerReference: string | null;
  quotedPartnerFee: number | null;
  expectedAmount: number;
  collectedAmount: number;
  hasCashMismatch: boolean;
  deliveredAt: string;
  remitBy: string;
  isOverdue: boolean;
};

export type CodRemittanceSummaryView = {
  id: string;
  partnerId: string;
  partnerName: string;
  reference: string;
  currency: string;
  receivedAt: string;
  collectedAmount: number;
  partnerFeeAmount: number;
  receivedAmount: number;
  parcelCount: number;
  recordedByName: string | null;
  createdAt: string;
};

export type CodRemittanceDetailView = CodRemittanceSummaryView & {
  note: string | null;
  lines: {
    shipmentId: string;
    trackingCode: string;
    orderId: string;
    collectedAmount: number;
    partnerFeeAmount: number;
  }[];
};
