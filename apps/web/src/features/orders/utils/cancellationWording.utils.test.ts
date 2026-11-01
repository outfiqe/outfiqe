import { describe, expect, it } from "vitest";

import type { OrderRefund } from "../api/refundSchemas";
import { describeItemCancellation } from "./cancellationWording.utils";

const buildRefund = (method: OrderRefund["method"]) =>
  ({ method, totalAmount: 8010 }) as OrderRefund;

describe("describeItemCancellation", () => {
  it("never promises a refund for cash that was not collected", () => {
    expect(describeItemCancellation(buildRefund("CASH_NOT_COLLECTED"))).toBe(
      "Cancelled. You won't pay for these items.",
    );
  });

  it("states the refund amount when money was paid", () => {
    expect(describeItemCancellation(buildRefund("GATEWAY"))).toBe(
      "Cancelled. Rs. 8,010 will be refunded.",
    );
  });

  it("states the refund amount while the method is still being decided", () => {
    expect(describeItemCancellation(buildRefund(null))).toBe(
      "Cancelled. Rs. 8,010 will be refunded.",
    );
  });
});
