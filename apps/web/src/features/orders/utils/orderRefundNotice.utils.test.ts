import { describe, expect, it } from "vitest";

import { NO_REFUND_SUMMARY, type OrderRefundSummary } from "../api/orderSchemas";
import {
  buildCancelledMoneyLines,
  buildOrderCancellationNotice,
  describeOrderRowRefund,
} from "./orderRefundNotice.utils";

const buildSummary = (overrides: Partial<OrderRefundSummary>): OrderRefundSummary => ({
  ...NO_REFUND_SUMMARY,
  ...overrides,
});

describe("buildOrderCancellationNotice", () => {
  it("has nothing to say about an order nothing was cancelled on", () => {
    expect(
      buildOrderCancellationNotice({
        fulfilmentStatus: "PLACED",
        paymentMethod: "COD",
        refundSummary: NO_REFUND_SUMMARY,
      }),
    ).toBeNull();
  });

  it("tells a cash-on-delivery shopper a fully cancelled order costs nothing", () => {
    expect(
      buildOrderCancellationNotice({
        fulfilmentStatus: "CANCELLED",
        paymentMethod: "COD",
        refundSummary: NO_REFUND_SUMMARY,
      }),
    ).toEqual({
      headline: "This order was cancelled.",
      reasonSentence: null,
      moneySentence: "You don't need to pay anything.",
      isActionNeeded: false,
    });
  });

  it("leaves an expired unpaid online order to the existing wording", () => {
    expect(
      buildOrderCancellationNotice({
        fulfilmentStatus: "CANCELLED",
        paymentMethod: "ESEWA",
        refundSummary: NO_REFUND_SUMMARY,
      }),
    ).toBeNull();
  });

  it("explains a sold-out cancellation and asks for refund details", () => {
    const notice = buildOrderCancellationNotice({
      fulfilmentStatus: "CANCELLED",
      paymentMethod: "ESEWA",
      refundSummary: buildSummary({
        cancelledUnitCount: 1,
        causes: ["SOLD_OUT_AT_PAYMENT"],
        amountComingBack: 1200,
        amountAwaitingDetails: 1200,
      }),
    });

    expect(notice).toEqual({
      headline: "This order was cancelled.",
      reasonSentence: "It sold out just before your payment went through.",
      moneySentence: "Rs. 1,200 is coming back to you. Add your refund details so we can send it.",
      isActionNeeded: true,
    });
  });

  it("splits a refund still coming back from one already paid", () => {
    const notice = buildOrderCancellationNotice({
      fulfilmentStatus: "CANCELLED",
      paymentMethod: "ESEWA",
      refundSummary: buildSummary({
        cancelledUnitCount: 2,
        causes: ["BRAND_UNAVAILABLE"],
        amountComingBack: 700,
        amountRefunded: 500,
      }),
    });

    expect(notice?.moneySentence).toBe("Rs. 700 refund is on its way. Rs. 500 was refunded.");
  });

  it("names how many items a partly cancelled order lost", () => {
    const notice = buildOrderCancellationNotice({
      fulfilmentStatus: "PLACED",
      paymentMethod: "COD",
      refundSummary: buildSummary({
        cancelledUnitCount: 1,
        causes: ["CUSTOMER_CANCELLED"],
        amountOffCashPayment: 800,
      }),
    });

    expect(notice).toEqual({
      headline: "1 item cancelled.",
      reasonSentence: "You cancelled it.",
      moneySentence: "Rs. 800 is off what you pay on delivery.",
      isActionNeeded: false,
    });
  });

  it("calls items that came back returned, not cancelled", () => {
    const notice = buildOrderCancellationNotice({
      fulfilmentStatus: "DELIVERED",
      paymentMethod: "ESEWA",
      refundSummary: buildSummary({
        cancelledUnitCount: 2,
        causes: ["RETURNED"],
        amountRefunded: 900,
      }),
    });

    expect(notice?.headline).toBe("2 items returned.");
  });
});

describe("buildCancelledMoneyLines", () => {
  it("shows a fully cancelled unpaid order as costing nothing", () => {
    expect(
      buildCancelledMoneyLines({
        total: 4210,
        fulfilmentStatus: "CANCELLED",
        paymentStatus: "DUE",
        refundSummary: NO_REFUND_SUMMARY,
      }),
    ).toEqual({ cancelledAmount: 4210, payLabel: "You pay", payAmount: 0 });
  });

  it("subtracts what a cash-on-delivery shopper no longer pays", () => {
    expect(
      buildCancelledMoneyLines({
        total: 3000,
        fulfilmentStatus: "PLACED",
        paymentStatus: "DUE",
        refundSummary: buildSummary({ amountOffCashPayment: 800 }),
      }),
    ).toEqual({ cancelledAmount: 800, payLabel: "You pay", payAmount: 2200 });
  });

  it("shows what a paid shopper keeps paying after a refund", () => {
    expect(
      buildCancelledMoneyLines({
        total: 3000,
        fulfilmentStatus: "PLACED",
        paymentStatus: "PARTIALLY_REFUNDED",
        refundSummary: buildSummary({ amountRefunded: 1000, amountComingBack: 500 }),
      }),
    ).toEqual({ cancelledAmount: 1500, payLabel: "You paid", payAmount: 1500 });
  });

  it("adds nothing when nothing was cancelled", () => {
    expect(
      buildCancelledMoneyLines({
        total: 3000,
        fulfilmentStatus: "PLACED",
        paymentStatus: "DUE",
        refundSummary: NO_REFUND_SUMMARY,
      }),
    ).toBeNull();
  });
});

describe("describeOrderRowRefund", () => {
  it("has no line for an order nothing was cancelled on", () => {
    expect(describeOrderRowRefund(NO_REFUND_SUMMARY)).toBeNull();
  });

  it("states only the count when no money moved", () => {
    expect(describeOrderRowRefund(buildSummary({ cancelledUnitCount: 3 }))).toEqual({
      text: "3 items cancelled",
      isActionNeeded: false,
    });
  });

  it("puts the action first when refund details are missing", () => {
    expect(
      describeOrderRowRefund(
        buildSummary({ cancelledUnitCount: 1, amountComingBack: 500, amountAwaitingDetails: 500 }),
      ),
    ).toEqual({
      text: "1 item cancelled · Action needed: add refund details",
      isActionNeeded: true,
    });
  });
});
