import type { FulfilmentStatus } from "#generated/prisma/enums.js";

import type { CANCELLATION_DECISION } from "./cancellation-request.constants.js";

export type CancellationRequestItemView = {
  orderItemId: string;
  productName: string;
  sizeLabel: string;
  unitPrice: number;
  qty: number;
  refundedQty: number;
};

export type CancellationRequestView = {
  fulfilmentGroupId: string;
  orderId: string;
  brandName: string;
  groupStatus: FulfilmentStatus;
  reason: string;
  requestedAt: string;
  remainingAmount: number;
  items: CancellationRequestItemView[];
};

export type CancellationDecisionView = {
  fulfilmentGroupId: string;
  orderId: string;
  decision: (typeof CANCELLATION_DECISION)[keyof typeof CANCELLATION_DECISION];
};
