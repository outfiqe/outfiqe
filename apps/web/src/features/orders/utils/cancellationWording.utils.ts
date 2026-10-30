import { OrderRefundMethod } from "@outfiqe/types";

import { PaymentStatus } from "../api/orderSchemas";
import type { OrderRefund } from "../api/refundSchemas";

export const NOTHING_TO_PAY_LABEL = "Nothing to pay";

export const hasNoMoneyTaken = (paymentStatus: string): boolean =>
  paymentStatus === PaymentStatus.DUE || paymentStatus === PaymentStatus.FAILED;

export const describeItemCancellation = ({ method, totalAmount }: OrderRefund): string =>
  method === OrderRefundMethod.CASH_NOT_COLLECTED
    ? "Cancelled. You won't pay for these items."
    : `Cancelled. Rs. ${totalAmount.toLocaleString()} will be refunded.`;
