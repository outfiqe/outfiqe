import { describe, expect, it } from "vitest";

import { listUnrefundedStockLines, priceRefund, REFUND_PRICING_PROBLEM } from "./refund.pricing.js";
import type { RefundableItem } from "./refund.types.js";

const socks: RefundableItem = {
  orderItemId: "socks",
  qty: 3,
  refundedQty: 0,
  unitPrice: 200,
  platformDiscountAmount: 50,
};

const shirt: RefundableItem = {
  orderItemId: "shirt",
  qty: 1,
  refundedQty: 0,
  unitPrice: 1000,
  platformDiscountAmount: 0,
};

const orderFees = { deliveryFee: 100, codFee: 25 };

const priceOk = (input: Parameters<typeof priceRefund>[0]) => {
  const priced = priceRefund(input);
  if ("problem" in priced) throw new Error(`Unexpected problem ${priced.problem}`);
  return priced.pricing;
};

describe("priceRefund", () => {
  it("refunds the net price of the units, after their share of the coupon", () => {
    const pricing = priceOk({
      items: [socks, shirt],
      lineRequests: [{ orderItemId: "socks", qty: 1 }],
      orderFees,
      refundsOrderFeesWhenEmptied: true,
    });

    expect(pricing).toEqual({
      lines: [{ orderItemId: "socks", qty: 1, amount: 183, couponShare: 16 }],
      goodsAmount: 183,
      feeAmount: 0,
      totalAmount: 183,
      emptiesOrder: false,
    });
  });

  it("adds up to the exact line total over several partial refunds", () => {
    const first = priceOk({
      items: [socks],
      lineRequests: [{ orderItemId: "socks", qty: 1 }],
      orderFees,
      refundsOrderFeesWhenEmptied: false,
    });
    const second = priceOk({
      items: [{ ...socks, refundedQty: 1 }],
      lineRequests: [{ orderItemId: "socks", qty: 1 }],
      orderFees,
      refundsOrderFeesWhenEmptied: false,
    });
    const third = priceOk({
      items: [{ ...socks, refundedQty: 2 }],
      lineRequests: [{ orderItemId: "socks", qty: 1 }],
      orderFees,
      refundsOrderFeesWhenEmptied: false,
    });

    expect(first.goodsAmount + second.goodsAmount + third.goodsAmount).toBe(550);
    expect(
      [first, second, third].reduce(
        (sum, pricing) => sum + (pricing.lines[0]?.couponShare ?? 0),
        0,
      ),
    ).toBe(50);
  });

  it("returns the delivery and COD fees only in the refund that empties the order", () => {
    const pricing = priceOk({
      items: [{ ...socks, refundedQty: 1 }, shirt],
      lineRequests: [
        { orderItemId: "socks", qty: 2 },
        { orderItemId: "shirt", qty: 1 },
      ],
      orderFees,
      refundsOrderFeesWhenEmptied: true,
    });

    expect(pricing.emptiesOrder).toBe(true);
    expect(pricing.feeAmount).toBe(125);
    expect(pricing.totalAmount).toBe(pricing.goodsAmount + 125);
  });

  it("keeps the fees when the cause doesn't return them", () => {
    const pricing = priceOk({
      items: [shirt],
      lineRequests: [{ orderItemId: "shirt", qty: 1 }],
      orderFees,
      refundsOrderFeesWhenEmptied: false,
    });

    expect(pricing).toMatchObject({ emptiesOrder: true, feeAmount: 0, totalAmount: 1000 });
  });

  it("refuses units already refunded, unknown items and empty requests", () => {
    const common = { orderFees, refundsOrderFeesWhenEmptied: true };

    expect(
      priceRefund({
        ...common,
        items: [{ ...socks, refundedQty: 2 }],
        lineRequests: [{ orderItemId: "socks", qty: 2 }],
      }),
    ).toEqual({ problem: REFUND_PRICING_PROBLEM.TOO_MANY_UNITS });
    expect(
      priceRefund({ ...common, items: [socks], lineRequests: [{ orderItemId: "hat", qty: 1 }] }),
    ).toEqual({ problem: REFUND_PRICING_PROBLEM.UNKNOWN_ITEM });
    expect(priceRefund({ ...common, items: [socks], lineRequests: [] })).toEqual({
      problem: REFUND_PRICING_PROBLEM.NO_UNITS,
    });
  });
});

describe("listUnrefundedStockLines", () => {
  it("keeps only the units that have not already been refunded", () => {
    const stockLines = listUnrefundedStockLines([
      { sizeId: "size-socks", qty: 3, refundedQty: 1 },
      { sizeId: "size-shirt", qty: 1, refundedQty: 0 },
    ]);

    expect(stockLines).toEqual([
      { sizeId: "size-socks", qty: 2 },
      { sizeId: "size-shirt", qty: 1 },
    ]);
  });

  it("drops lines whose units were all refunded", () => {
    const stockLines = listUnrefundedStockLines([{ sizeId: "size-shirt", qty: 1, refundedQty: 1 }]);

    expect(stockLines).toEqual([]);
  });
});
