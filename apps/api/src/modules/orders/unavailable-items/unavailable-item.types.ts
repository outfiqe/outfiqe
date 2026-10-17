import type { BrandUnavailableRequestStatus } from "#generated/prisma/enums.js";

export type UnavailableItemRequestView = {
  id: string;
  orderId: string;
  fulfilmentGroupId: string;
  orderItemId: string;
  brandName: string;
  productName: string;
  sizeLabel: string;
  unitPrice: number;
  qty: number;
  reason: string;
  status: BrandUnavailableRequestStatus;
  decisionNote: string | null;
  refundId: string | null;
  createdAt: string;
  decidedAt: string | null;
};
