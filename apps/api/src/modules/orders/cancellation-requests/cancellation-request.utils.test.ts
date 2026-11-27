import { describe, expect, it } from "vitest";

import { FulfilmentMode, FulfilmentStatus } from "#generated/prisma/enums.js";

import type { CancellationRequestRecord } from "./cancellation-request.repository.js";
import { listRemainingLines, toCancellationRequestView } from "./cancellation-request.utils.js";

const REQUESTED_AT = new Date("2026-11-20T10:00:00.000Z");

const buildRequest = (): CancellationRequestRecord => ({
  id: "group-1",
  orderId: "order-1",
  brandId: "brand-1",
  status: FulfilmentStatus.PLACED,
  fulfilmentMode: FulfilmentMode.BRAND_SHIPS,
  pickupStatus: null,
  cancellationRequestedAt: REQUESTED_AT,
  cancellationReason: "Out of stock",
  brand: { name: "Maison", email: "maison@brand.test" },
  items: [
    {
      id: "item-1",
      qty: 3,
      refundedQty: 1,
      unitPrice: 500,
      product: { name: "Jacket" },
      size: { label: "M" },
    },
    {
      id: "item-2",
      qty: 1,
      refundedQty: 1,
      unitPrice: 200,
      product: { name: "Scarf" },
      size: { label: "L" },
    },
  ],
});

describe("listRemainingLines", () => {
  it("lists only items that still have unrefunded units", () => {
    expect(listRemainingLines(buildRequest())).toEqual([{ orderItemId: "item-1", qty: 2 }]);
  });
});

describe("toCancellationRequestView", () => {
  it("totals the unrefunded amount and carries the brand's reason and request time", () => {
    expect(toCancellationRequestView(buildRequest())).toMatchObject({
      fulfilmentGroupId: "group-1",
      orderId: "order-1",
      brandName: "Maison",
      reason: "Out of stock",
      requestedAt: REQUESTED_AT.toISOString(),
      remainingAmount: 1000,
    });
  });
});
