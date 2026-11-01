import { describe, expect, it } from "vitest";

import type { RelationshipOrderLine } from "../api/relationshipsSchemas";
import {
  toOrderHeadline,
  toOrderReference,
  toOrderStatusLine,
  toPaymentMethodLabel,
} from "./orderRow.utils";

const lineFor = (productName: string): RelationshipOrderLine => ({
  orderItemId: productName,
  productId: productName,
  productName,
  imageUrl: null,
  sizeLabel: "M",
  qty: 1,
  unitPrice: 1000,
  refundedQty: 0,
  isLive: true,
});

describe("toOrderReference", () => {
  it("shortens the id the way other order screens do", () => {
    expect(toOrderReference("be19df16-0b3c-4596")).toBe("#BE19DF16");
  });
});

describe("toOrderHeadline", () => {
  it("names the product of a single-product order", () => {
    expect(toOrderHeadline({ lines: [lineFor("Coat")] })).toBe("Coat");
  });

  it("counts the other products of a bigger order", () => {
    expect(toOrderHeadline({ lines: [lineFor("Coat"), lineFor("Tee"), lineFor("Cap")] })).toBe(
      "Coat + 2 more",
    );
  });
});

describe("toOrderStatusLine", () => {
  const statuses = {
    paymentStatus: "PAID",
    fulfilmentStatus: "OUT_FOR_DELIVERY",
    createdAt: "2026-10-26T00:00:00.000Z",
  };

  it("uses the singular for one item", () => {
    expect(toOrderStatusLine({ ...statuses, itemCount: 1 })).toMatch(
      /^1 item · Paid · Out for delivery · /,
    );
  });

  it("uses the plural for more", () => {
    expect(toOrderStatusLine({ ...statuses, itemCount: 2 })).toMatch(/^2 items · /);
  });
});

describe("toPaymentMethodLabel", () => {
  it("spells out known methods", () => {
    expect(toPaymentMethodLabel("COD")).toBe("Cash on delivery");
    expect(toPaymentMethodLabel("ESEWA")).toBe("eSewa");
  });

  it("stays readable for a method it doesn't know", () => {
    expect(toPaymentMethodLabel("BANK_TRANSFER")).toBe("Bank transfer");
  });
});
