import { describe, expect, it } from "vitest";

import { OrderRefundCause, OrderRefundMethod, OrderRefundStatus } from "#generated/prisma/enums.js";

import { type OrderRefundSummaryRow, summariseOrderRefunds } from "./refund-summary.utils.js";

const buildRefund = (overrides: Partial<OrderRefundSummaryRow>): OrderRefundSummaryRow => ({
  cause: OrderRefundCause.BRAND_UNAVAILABLE,
  status: OrderRefundStatus.SUCCEEDED,
  method: OrderRefundMethod.GATEWAY,
  totalAmount: 1000,
  lines: [{ qty: 1 }],
  ...overrides,
});

describe("summariseOrderRefunds", () => {
  it("is all zero for an order without refunds", () => {
    expect(summariseOrderRefunds([], false)).toEqual({
      cancelledUnitCount: 0,
      causes: [],
      amountOffCashPayment: 0,
      amountRefunded: 0,
      amountComingBack: 0,
      amountAwaitingDetails: 0,
    });
  });

  it("counts cash that will not be collected separately from money going back", () => {
    const summary = summariseOrderRefunds(
      [
        buildRefund({ method: OrderRefundMethod.CASH_NOT_COLLECTED, totalAmount: 700 }),
        buildRefund({ totalAmount: 300, lines: [{ qty: 2 }, { qty: 1 }] }),
      ],
      false,
    );

    expect(summary).toMatchObject({
      cancelledUnitCount: 4,
      amountOffCashPayment: 700,
      amountRefunded: 300,
      amountComingBack: 0,
    });
  });

  it("lists each cause once, in the order the refunds happened", () => {
    const summary = summariseOrderRefunds(
      [
        buildRefund({ cause: OrderRefundCause.CUSTOMER_CANCELLED }),
        buildRefund({ cause: OrderRefundCause.BRAND_UNAVAILABLE }),
        buildRefund({ cause: OrderRefundCause.CUSTOMER_CANCELLED }),
      ],
      false,
    );

    expect(summary.causes).toEqual([
      OrderRefundCause.CUSTOMER_CANCELLED,
      OrderRefundCause.BRAND_UNAVAILABLE,
    ]);
  });

  it("asks for refund details only while a manual refund has no destination", () => {
    const refunds = [
      buildRefund({ status: OrderRefundStatus.NEEDS_MANUAL, method: null, totalAmount: 1200 }),
    ];

    expect(summariseOrderRefunds(refunds, false)).toMatchObject({
      amountComingBack: 1200,
      amountAwaitingDetails: 1200,
    });
    expect(summariseOrderRefunds(refunds, true)).toMatchObject({
      amountComingBack: 1200,
      amountAwaitingDetails: 0,
    });
  });

  it("treats a pending gateway refund as coming back", () => {
    const summary = summariseOrderRefunds(
      [buildRefund({ status: OrderRefundStatus.PENDING, totalAmount: 500 })],
      false,
    );

    expect(summary).toMatchObject({ amountComingBack: 500, amountAwaitingDetails: 0 });
  });
});
