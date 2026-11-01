import { OrderRefundMethod } from "@outfiqe/types";

import { FulfilmentStatus, PaymentStatus } from "../api/orderSchemas";
import type { OrderRefund } from "../api/refundSchemas";

export const NOTHING_TO_PAY_LABEL = "Nothing to pay";

const FULFILMENT_STATUSES_THAT_ENDED_THE_ORDER: string[] = [
  FulfilmentStatus.CANCELLED,
  FulfilmentStatus.RETURNED,
];

export const hasNoMoneyTaken = (paymentStatus: string): boolean =>
  paymentStatus === PaymentStatus.DUE || paymentStatus === PaymentStatus.FAILED;

export const hasNothingLeftToPay = (fulfilmentStatus: string, paymentStatus: string): boolean =>
  FULFILMENT_STATUSES_THAT_ENDED_THE_ORDER.includes(fulfilmentStatus) &&
  hasNoMoneyTaken(paymentStatus);

export const describeItemCancellation = ({ method, totalAmount }: OrderRefund): string =>
  method === OrderRefundMethod.CASH_NOT_COLLECTED
    ? "Cancelled. You won't pay for these items."
    : `Cancelled. Rs. ${totalAmount.toLocaleString()} will be refunded.`;
