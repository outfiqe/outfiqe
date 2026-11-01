import { describe, expect, it } from "vitest";

import {
  ANALYTICS_EVENT_NAME_PATTERN,
  ANALYTICS_EVENTS,
  ANALYTICS_SEARCH_QUERY_MAX_LENGTH,
  toAnalyticsPaymentMethod,
  toAnalyticsSearchQuery,
} from "./index";

const eventNames = Object.values(ANALYTICS_EVENTS);

describe("ANALYTICS_EVENTS", () => {
  it("gives every event its own name", () => {
    expect(new Set(eventNames).size).toBe(eventNames.length);
  });

  it("names every event area:object_action in lowercase snake case", () => {
    for (const eventName of eventNames) {
      expect(eventName).toMatch(ANALYTICS_EVENT_NAME_PATTERN);
    }
  });

  it("rejects names that break the convention", () => {
    expect("Checkout:OrderPlace").not.toMatch(ANALYTICS_EVENT_NAME_PATTERN);
    expect("order_place").not.toMatch(ANALYTICS_EVENT_NAME_PATTERN);
    expect("checkout:order-place").not.toMatch(ANALYTICS_EVENT_NAME_PATTERN);
  });
});

describe("toAnalyticsPaymentMethod", () => {
  it("maps each checkout payment method to its analytics value", () => {
    expect(toAnalyticsPaymentMethod("COD")).toBe("cod");
    expect(toAnalyticsPaymentMethod("ESEWA")).toBe("esewa");
    expect(toAnalyticsPaymentMethod("KHALTI")).toBe("khalti");
  });

  it("returns null for a method analytics doesn't know", () => {
    expect(toAnalyticsPaymentMethod("CARD")).toBeNull();
  });
});

describe("toAnalyticsSearchQuery", () => {
  it("trims and lowercases the query", () => {
    expect(toAnalyticsSearchQuery("  Red Kurta  ")).toBe("red kurta");
  });

  it("caps a long query at the maximum length", () => {
    const longQuery = "a".repeat(ANALYTICS_SEARCH_QUERY_MAX_LENGTH * 2);
    expect(toAnalyticsSearchQuery(longQuery)).toHaveLength(ANALYTICS_SEARCH_QUERY_MAX_LENGTH);
  });
});
