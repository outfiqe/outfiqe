import { describe, expect, it } from "vitest";

import { PaymentMethod } from "#generated/prisma/enums.js";

import type { LedgerRow } from "./financialRollup.types.js";
import {
  buildPaymentMethodBreakdown,
  decodeLedgerCursor,
  encodeLedgerCursor,
  sumStatusBuckets,
  toLedgerCsv,
} from "./financialRollup.utils.js";

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
  brandPayoutStatus: "WITHDRAWN",
  creatorCommissionAmount: 100,
  creatorCommissionStatus: "AVAILABLE",
  ...overrides,
});

describe("toLedgerCsv", () => {
  it("writes a header row plus one row per entry", () => {
    const csv = toLedgerCsv([buildLedgerRow()]);
    const lines = csv.split("\r\n");

    expect(lines[0]).toBe(
      "Order ID,Order Item ID,Date,Payment Method,Gross,Platform Fee,Gateway Fee,Creator Commission,Brand Net,Brand Payout Status",
    );
    expect(lines[1]).toBe(
      "order-1,item-1,2026-01-05T10:00:00.000Z,COD,1000,50,0,100,950,WITHDRAWN",
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

    expect(csv.split("\r\n")[1]).toBe("order-1,item-1,2026-01-05T10:00:00.000Z,COD,,,,,,");
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
