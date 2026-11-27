import {
  ORDER_TRACKING_STAGE_MESSAGES,
  type OrderTrackingStage,
} from "../order-tracking/orderTrackingStage";

const YOUR_ORDER_PREFIX = "Your order";
const NO_ORDER_REFERENCE_SUBJECT = "your order";

type OrderStatusCopyInput = {
  trackingStage?: OrderTrackingStage;
  status?: string;
  orderReference?: string;
};

type RefundCopyInput = {
  amount?: number | string;
  orderReference?: string;
  productName?: string;
};

type RefundIssuedCopyInput = RefundCopyInput & {
  isTakenOffCashToCollect: boolean;
  emptiesOrder?: boolean;
};

const nameOrderInMessage = (message: string, orderReference: string | undefined): string => {
  if (!orderReference) return message;
  return message.startsWith(YOUR_ORDER_PREFIX)
    ? `Order ${orderReference}${message.slice(YOUR_ORDER_PREFIX.length)}`
    : `${message} (order ${orderReference})`;
};

const describeRefundSubject = ({ orderReference, productName }: RefundCopyInput): string => {
  if (productName) {
    return orderReference ? `${productName} (order ${orderReference})` : productName;
  }
  return orderReference ? `order ${orderReference}` : NO_ORDER_REFERENCE_SUBJECT;
};

export const describeOrderStatusChange = ({
  trackingStage,
  status,
  orderReference,
}: OrderStatusCopyInput): string =>
  nameOrderInMessage(
    trackingStage
      ? ORDER_TRACKING_STAGE_MESSAGES[trackingStage]
      : `Your order was ${(status ?? "updated").toLowerCase()}`,
    orderReference,
  );

export const describeRefundIssued = (input: RefundIssuedCopyInput): string => {
  const { amount, orderReference, isTakenOffCashToCollect, emptiesOrder } = input;
  if (!isTakenOffCashToCollect) {
    return `We've refunded Rs. ${amount ?? ""} on ${describeRefundSubject(input)}`;
  }
  if (emptiesOrder) {
    return `${orderReference ? `Order ${orderReference}` : "Your order"} was cancelled — nothing to pay`;
  }
  return `You'll pay Rs. ${amount ?? ""} less on delivery of ${describeRefundSubject(input)}`;
};

export const describeRefundDetailsNeeded = (input: RefundCopyInput): string =>
  `Tell us where to send your Rs. ${input.amount ?? ""} refund for ${describeRefundSubject(input)}`;
