import { describe, expect, it } from "vitest";

import { PaymentMethod } from "#generated/prisma/enums.js";

import type { LedgerRow } from "./financial-rollup.types.js";
import {
  buildAttributionView,
  buildMoneyBreakdown,
  buildPaymentMethodBreakdown,
  decodeLedgerCursor,
  encodeLedgerCursor,
  sumStatusBuckets,
  toLedgerCsv,
} from "./financial-rollup.utils.js";

describe("buildMoneyBreakdown", () => {
  const paidOrderMoney = {
    collected: 2_150,
    refunded: 0,
    orderFees: 200,
    couponSpend: 50,
    brandsOwed: 900,
    brandsPaid: 500,
    platformFees: 100,
    gatewayFees: 20,
    cancelledItems: 500,
    musesOwed: 30,
    musesPaid: 10,
  };

  it("accounts for every rupee when the money adds up", () => {
    const moneyBreakdown = buildMoneyBreakdown("30d", paidOrderMoney);

    expect(moneyBreakdown.held).toBe(2_150);
    expect(moneyBreakdown.platformKeeps).toBe(40);
    expect(moneyBreakdown.cancelledNotRefunded).toBe(500);
    expect(moneyBreakdown.unexplained).toBe(0);
  });

  it("stops counting cancelled money once it has been refunded", () => {
    const moneyBreakdown = buildMoneyBreakdown("30d", { ...paidOrderMoney, refunded: 500 });

    expect(moneyBreakdown.held).toBe(1_650);
    expect(moneyBreakdown.cancelledNotRefunded).toBe(0);
    expect(moneyBreakdown.unexplained).toBe(0);
  });

  it("shows what can't be traced", () => {
    const { unexplained } = buildMoneyBreakdown("30d", { ...paidOrderMoney, collected: 2_250 });

    expect(unexplained).toBe(100);
  });
});

describe("sumStatusBuckets", () => {
  it("adds up only the requested statuses and treats a missing bucket as zero", () => {
    const byStatus = { PENDING: 100, AVAILABLE: 40, PAID: 9000, VOIDED: 7 };

    expect(sumStatusBuckets(byStatus, ["PENDING", "AVAILABLE"])).toBe(140);
    expect(sumStatusBuckets(byStatus, ["PENDING", "APPROVED", "AVAILABLE"])).toBe(140);
  });

  it("returns zero when nothing matches", () => {
    expect(sumStatusBuckets({}, ["PENDING"])).toBe(0);
    expect(sumStatusBuckets({ PAID: 500 }, ["PENDING", "AVAILABLE"])).toBe(0);
  });
});

describe("buildPaymentMethodBreakdown", () => {
  it("computes GMV, order count, and realized take rate per payment method", () => {
    const breakdown = buildPaymentMethodBreakdown(
      [
        { paymentMethod: PaymentMethod.COD, total: 1000, orderCount: 2 },
        { paymentMethod: PaymentMethod.ESEWA, total: 2000, orderCount: 4 },
      ],
      [
        { paymentMethod: PaymentMethod.COD, platformFee: 50, gatewayFee: 0 },
        { paymentMethod: PaymentMethod.ESEWA, platformFee: 100, gatewayFee: 30 },
      ],
    );

    expect(breakdown.COD).toEqual({ gmv: 1000, orderCount: 2, realizedTakeRate: 0.05 });
    expect(breakdown.ESEWA).toEqual({ gmv: 2000, orderCount: 4, realizedTakeRate: 0.035 });
  });

  it("defaults fees to zero when a method has GMV but no realized payouts yet", () => {
    const breakdown = buildPaymentMethodBreakdown(
      [{ paymentMethod: PaymentMethod.KHALTI, total: 500, orderCount: 1 }],
      [],
    );

    expect(breakdown.KHALTI).toEqual({ gmv: 500, orderCount: 1, realizedTakeRate: 0 });
  });

  it("never divides by zero when a method has zero GMV", () => {
    const breakdown = buildPaymentMethodBreakdown(
      [{ paymentMethod: PaymentMethod.COD, total: 0, orderCount: 0 }],
      [{ paymentMethod: PaymentMethod.COD, platformFee: 0, gatewayFee: 0 }],
    );

    expect(breakdown.COD?.realizedTakeRate).toBe(0);
  });

  it("omits methods with no orders in the range", () => {
    const breakdown = buildPaymentMethodBreakdown([], []);
    expect(breakdown).toEqual({});
  });
});

describe("encodeLedgerCursor / decodeLedgerCursor", () => {
  it("round-trips a cursor", () => {
    const createdAt = new Date("2026-01-05T10:00:00.000Z");
    const cursor = encodeLedgerCursor({ createdAt, orderItemId: "item-1" });

    expect(decodeLedgerCursor(cursor)).toEqual({ createdAt, orderItemId: "item-1" });
  });

  it("throws a 400 AppError for a cursor that isn't valid base64url JSON", () => {
    expect(() => decodeLedgerCursor("not-a-real-cursor")).toThrow(
      expect.objectContaining({ status: 400, code: "INVALID_LEDGER_CURSOR" }),
    );
  });

  it("throws for a cursor missing required fields", () => {
    const malformed = Buffer.from(JSON.stringify({ createdAt: "2026-01-05" })).toString(
      "base64url",
    );
    expect(() => decodeLedgerCursor(malformed)).toThrow(expect.objectContaining({ status: 400 }));
  });
});

const buildLedgerRow = (overrides: Partial<LedgerRow> = {}): LedgerRow => ({
  orderId: "order-1",
  orderItemId: "item-1",
  createdAt: new Date("2026-01-05T10:00:00.000Z"),
  paymentMethod: PaymentMethod.COD,
  grossAmount: 1000,
  platformFee: 50,
  gatewayFee: 0,
  brandNetAmount: 950,
  orderPaymentStatus: "PAID",
  orderFulfilmentStatus: "DELIVERED",
  quantity: 1,
  productName: "Item",
  productImageUrl: null,
  brandName: "Brand",
  buyerName: "Buyer",
  museHandle: null,
  brandPayoutStatus: "WITHDRAWN",
  creatorCommissionAmount: 100,
  creatorCommissionStatus: "AVAILABLE",
  ...overrides,
});

describe("toLedgerCsv spreadsheet safety", () => {
  it("stops a name from running as a spreadsheet formula", () => {
    const csv = toLedgerCsv([buildLedgerRow({ buyerName: '=HYPERLINK("http://bad.test")' })]);

    expect(csv).toContain(`"'=HYPERLINK(`);
  });

  it("leaves plain amounts alone, even a negative one", () => {
    const csv = toLedgerCsv([buildLedgerRow({ grossAmount: -100 })]);

    expect(csv).toContain(",-100,");
  });
});

describe("toLedgerCsv", () => {
  it("writes a header row plus one row per entry", () => {
    const csv = toLedgerCsv([buildLedgerRow()]);
    const lines = csv.split("\r\n");

    expect(lines[0]).toBe(
      "Order ID,Order Item ID,Date,Payment Method,Gross,Platform Fee,Gateway Fee,Muse Commission,Brand Net,Brand Payout Status,Product,Brand,Buyer,Muse",
    );
    expect(lines[1]).toBe(
      "order-1,item-1,2026-01-05T10:00:00.000Z,COD,1000,50,0,100,950,WITHDRAWN,Item,Brand,Buyer,",
    );
  });

  it("renders null fields as empty, not the literal word null", () => {
    const csv = toLedgerCsv([
      buildLedgerRow({
        grossAmount: null,
        platformFee: null,
        gatewayFee: null,
        brandNetAmount: null,
        brandPayoutStatus: null,
        creatorCommissionAmount: null,
      }),
    ]);

    expect(csv.split("\r\n")[1]).toBe(
      "order-1,item-1,2026-01-05T10:00:00.000Z,COD,,,,,,,Item,Brand,Buyer,",
    );
  });

  it("quotes and escapes fields containing commas, quotes, or newlines", () => {
    const csv = toLedgerCsv([
      buildLedgerRow({ brandPayoutStatus: 'weird, "status"\nvalue' as never }),
    ]);

    expect(csv.split("\r\n").at(-1)).toContain('"weird, ""status""');
  });

  it("returns just the header row for an empty ledger", () => {
    expect(toLedgerCsv([]).split("\r\n")).toHaveLength(1);
  });
});

describe("buildAttributionView", () => {
  it("computes the attributed share", () => {
    expect(buildAttributionView({ totalItems: 4, attributedItems: 3 })).toEqual({
      totalItems: 4,
      attributedItems: 3,
      attributedShare: 0.75,
    });
  });

  it("never divides by zero when there are no order items yet", () => {
    expect(buildAttributionView({ totalItems: 0, attributedItems: 0 })).toEqual({
      totalItems: 0,
      attributedItems: 0,
      attributedShare: 0,
    });
  });

  it("is zero when there are orders but none are attributed", () => {
    expect(buildAttributionView({ totalItems: 5, attributedItems: 0 }).attributedShare).toBe(0);
  });

  it("is one when every order item is attributed", () => {
    expect(buildAttributionView({ totalItems: 5, attributedItems: 5 }).attributedShare).toBe(1);
  });
});
