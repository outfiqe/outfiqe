import { describe, expect, it } from "vitest";

import { FulfilmentStatus, OrderFulfilmentSummary } from "#generated/prisma/enums.js";

import { deriveOrderFulfilment } from "./order.utils.js";

const { PLACED, PACKED, SHIPPED, DELIVERED, CANCELLED } = FulfilmentStatus;

describe("deriveOrderFulfilment", () => {
  it("treats an order with no groups as placed and unfulfilled", () => {
    expect(deriveOrderFulfilment([])).toEqual({
      fulfilmentStatus: PLACED,
      fulfilmentSummary: OrderFulfilmentSummary.UNFULFILLED,
    });
  });

  it.each([
    [PLACED, PLACED, OrderFulfilmentSummary.UNFULFILLED],
    [PACKED, PACKED, OrderFulfilmentSummary.UNFULFILLED],
    [SHIPPED, SHIPPED, OrderFulfilmentSummary.SHIPPED],
    [DELIVERED, DELIVERED, OrderFulfilmentSummary.FULFILLED],
    [CANCELLED, CANCELLED, OrderFulfilmentSummary.CANCELLED],
  ])("maps a single %s group to status %s / summary %s", (groupStatus, status, summary) => {
    expect(deriveOrderFulfilment([groupStatus])).toEqual({
      fulfilmentStatus: status,
      fulfilmentSummary: summary,
    });
  });

  it("stays unfulfilled while every group is still placed or packed", () => {
    expect(deriveOrderFulfilment([PLACED, PACKED])).toEqual({
      fulfilmentStatus: PLACED,
      fulfilmentSummary: OrderFulfilmentSummary.UNFULFILLED,
    });
  });

  it("is partially shipped when some but not all groups have shipped", () => {
    expect(deriveOrderFulfilment([PLACED, SHIPPED])).toEqual({
      fulfilmentStatus: PLACED,
      fulfilmentSummary: OrderFulfilmentSummary.PARTIALLY_SHIPPED,
    });
    expect(deriveOrderFulfilment([PACKED, DELIVERED])).toEqual({
      fulfilmentStatus: PACKED,
      fulfilmentSummary: OrderFulfilmentSummary.PARTIALLY_SHIPPED,
    });
  });

  it("is shipped once every group is shipped or later but not all delivered", () => {
    expect(deriveOrderFulfilment([SHIPPED, SHIPPED])).toEqual({
      fulfilmentStatus: SHIPPED,
      fulfilmentSummary: OrderFulfilmentSummary.SHIPPED,
    });
    expect(deriveOrderFulfilment([SHIPPED, DELIVERED])).toEqual({
      fulfilmentStatus: SHIPPED,
      fulfilmentSummary: OrderFulfilmentSummary.SHIPPED,
    });
  });

  it("is fulfilled only when every active group is delivered", () => {
    expect(deriveOrderFulfilment([DELIVERED, DELIVERED])).toEqual({
      fulfilmentStatus: DELIVERED,
      fulfilmentSummary: OrderFulfilmentSummary.FULFILLED,
    });
  });

  it("ignores cancelled groups when deriving progress", () => {
    expect(deriveOrderFulfilment([CANCELLED, DELIVERED])).toEqual({
      fulfilmentStatus: DELIVERED,
      fulfilmentSummary: OrderFulfilmentSummary.FULFILLED,
    });
    expect(deriveOrderFulfilment([CANCELLED, PLACED])).toEqual({
      fulfilmentStatus: PLACED,
      fulfilmentSummary: OrderFulfilmentSummary.UNFULFILLED,
    });
    expect(deriveOrderFulfilment([CANCELLED, SHIPPED, PLACED])).toEqual({
      fulfilmentStatus: PLACED,
      fulfilmentSummary: OrderFulfilmentSummary.PARTIALLY_SHIPPED,
    });
  });

  it("is cancelled only when every group is cancelled", () => {
    expect(deriveOrderFulfilment([CANCELLED, CANCELLED])).toEqual({
      fulfilmentStatus: CANCELLED,
      fulfilmentSummary: OrderFulfilmentSummary.CANCELLED,
    });
  });
});
