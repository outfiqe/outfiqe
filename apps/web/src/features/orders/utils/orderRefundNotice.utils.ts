import type { OrderRefundCause } from "@outfiqe/types";

import { formatRupees } from "@/shared/lib/formatRupees";

import {
  FulfilmentStatus,
  type FulfilmentStatusValue,
  type OrderRefundSummary,
  PaymentMethod,
  type PaymentMethodValue,
} from "../api/orderSchemas";
import { CANCELLATION_REASON_SENTENCES, RETURN_CAUSES } from "../constants/refundLabels";
import { hasNoMoneyTaken } from "./cancellationWording.utils";

const NONE = 0;
const SINGLE_UNIT = 1;

export const ACTION_NEEDED_REFUND_LABEL = "Action needed: add refund details";
export const NOTHING_TO_PAY_SENTENCE = "You don't need to pay anything.";
export const ORDER_CANCELLED_HEADLINE = "This order was cancelled.";

export type OrderCancellationNotice = {
  headline: string;
  reasonSentence: string | null;
  moneySentence: string | null;
  isActionNeeded: boolean;
};

export type CancelledMoneyLines = {
  cancelledAmount: number;
  payLabel: string;
  payAmount: number;
};

type CancellationNoticeInput = {
  fulfilmentStatus: FulfilmentStatusValue;
  paymentMethod: PaymentMethodValue;
  refundSummary: OrderRefundSummary;
};

type CancelledMoneyInput = {
  total: number;
  fulfilmentStatus: FulfilmentStatusValue;
  paymentStatus: string;
  refundSummary: OrderRefundSummary;
};

const countLabel = (unitCount: number, pastTenseVerb: string): string =>
  `${unitCount} ${unitCount === SINGLE_UNIT ? "item" : "items"} ${pastTenseVerb}`;

const isReturnOnly = (causes: readonly OrderRefundCause[]): boolean =>
  causes.length > NONE && causes.every((cause) => RETURN_CAUSES.has(cause));

const describeReasons = (causes: readonly OrderRefundCause[]): string | null =>
  causes.length > NONE
    ? causes.map((cause) => CANCELLATION_REASON_SENTENCES[cause]).join(" ")
    : null;

const describeRefundMoney = (refundSummary: OrderRefundSummary): string | null => {
  const { amountAwaitingDetails, amountComingBack, amountRefunded, amountOffCashPayment } =
    refundSummary;
  const sentences: string[] = [];
  if (amountAwaitingDetails > NONE) {
    sentences.push(
      `${formatRupees(amountAwaitingDetails)} is coming back to you. Add your refund details so we can send it.`,
    );
  }
  const amountOnItsWay = amountComingBack - amountAwaitingDetails;
  if (amountOnItsWay > NONE) {
    sentences.push(`${formatRupees(amountOnItsWay)} refund is on its way.`);
  }
  if (amountRefunded > NONE) sentences.push(`${formatRupees(amountRefunded)} was refunded.`);
  if (amountOffCashPayment > NONE) {
    sentences.push(`${formatRupees(amountOffCashPayment)} is off what you pay on delivery.`);
  }
  return sentences.length > NONE ? sentences.join(" ") : null;
};

export const buildOrderCancellationNotice = ({
  fulfilmentStatus,
  paymentMethod,
  refundSummary,
}: CancellationNoticeInput): OrderCancellationNotice | null => {
  const { cancelledUnitCount, causes, amountAwaitingDetails } = refundSummary;
  const isActionNeeded = amountAwaitingDetails > NONE;
  const moneySentence = describeRefundMoney(refundSummary);
  const reasonSentence = describeReasons(causes);

  if (fulfilmentStatus === FulfilmentStatus.CANCELLED) {
    const isCashOrderWithNoRefund = paymentMethod === PaymentMethod.COD && moneySentence === null;
    if (cancelledUnitCount === NONE && !isCashOrderWithNoRefund) return null;
    return {
      headline: ORDER_CANCELLED_HEADLINE,
      reasonSentence,
      moneySentence: moneySentence ?? NOTHING_TO_PAY_SENTENCE,
      isActionNeeded,
    };
  }

  if (cancelledUnitCount === NONE) return null;
  const pastTenseVerb = isReturnOnly(causes) ? "returned" : "cancelled";
  return {
    headline: `${countLabel(cancelledUnitCount, pastTenseVerb)}.`,
    reasonSentence,
    moneySentence,
    isActionNeeded,
  };
};

export const buildCancelledMoneyLines = ({
  total,
  fulfilmentStatus,
  paymentStatus,
  refundSummary,
}: CancelledMoneyInput): CancelledMoneyLines | null => {
  const { amountOffCashPayment, amountRefunded, amountComingBack } = refundSummary;
  const isMoneyUntaken = hasNoMoneyTaken(paymentStatus);
  const isWholeOrderCancelledUnpaid =
    fulfilmentStatus === FulfilmentStatus.CANCELLED && isMoneyUntaken;
  const cancelledAmount = isWholeOrderCancelledUnpaid
    ? total
    : amountOffCashPayment + amountRefunded + amountComingBack;
  if (cancelledAmount === NONE) return null;

  return {
    cancelledAmount,
    payLabel: isMoneyUntaken ? "You pay" : "You paid",
    payAmount: Math.max(total - cancelledAmount, NONE),
  };
};

export const describeOrderRowRefund = (
  refundSummary: OrderRefundSummary,
): { text: string; isActionNeeded: boolean } | null => {
  const {
    cancelledUnitCount,
    causes,
    amountAwaitingDetails,
    amountComingBack,
    amountRefunded,
    amountOffCashPayment,
  } = refundSummary;
  if (cancelledUnitCount === NONE) return null;

  const countText = countLabel(cancelledUnitCount, isReturnOnly(causes) ? "returned" : "cancelled");
  if (amountAwaitingDetails > NONE) {
    return { text: `${countText} · ${ACTION_NEEDED_REFUND_LABEL}`, isActionNeeded: true };
  }
  if (amountComingBack > NONE) {
    return {
      text: `${countText} · ${formatRupees(amountComingBack)} refund on its way`,
      isActionNeeded: false,
    };
  }
  if (amountRefunded > NONE) {
    return {
      text: `${countText} · ${formatRupees(amountRefunded)} refunded`,
      isActionNeeded: false,
    };
  }
  if (amountOffCashPayment > NONE) {
    return {
      text: `${countText} · ${formatRupees(amountOffCashPayment)} off what you pay on delivery`,
      isActionNeeded: false,
    };
  }
  return { text: countText, isActionNeeded: false };
};
