import type {
  OrderRefundCause,
  OrderRefundMethod,
  OrderRefundStatus,
  PaymentMethod,
  RefundDestinationKind,
} from "#generated/prisma/enums.js";

export type RefundableItem = {
  orderItemId: string;
  qty: number;
  refundedQty: number;
  unitPrice: number;
  platformDiscountAmount: number;
};

export type RefundLineRequest = { orderItemId: string; qty: number };

export type PricedRefundLine = {
  orderItemId: string;
  qty: number;
  amount: number;
  couponShare: number;
};

export type OrderRefundView = {
  id: string;
  cause: OrderRefundCause;
  reason: string;
  status: OrderRefundStatus;
  method: OrderRefundMethod | null;
  goodsAmount: number;
  feeAmount: number;
  totalAmount: number;
  transferReference: string | null;
  createdAt: string;
  settledAt: string | null;
  lines: {
    orderItemId: string;
    productName: string;
    sizeLabel: string;
    qty: number;
    amount: number;
  }[];
};

export type RefundQueueItemView = OrderRefundView & {
  orderId: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
  destination: {
    kind: RefundDestinationKind;
    walletId: string | null;
    bankName: string | null;
    accountName: string;
    accountNumberLast4: string | null;
    updatedAt: string;
  } | null;
};

export type RefundPricing = {
  lines: PricedRefundLine[];
  goodsAmount: number;
  feeAmount: number;
  totalAmount: number;
  emptiesOrder: boolean;
};
