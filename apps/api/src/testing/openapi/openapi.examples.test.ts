import { describe, expect, it } from "vitest";

import { normalizeExampleValues } from "./openapi.example-normalizer.js";
import {
  keepUnchangedExamples,
  mergeRecordedExamples,
  toComparableExample,
} from "./openapi.examples.js";
import type { EndpointExample, RecordedExchange } from "./openapi.types.js";

const ORDER_ID = "6f1c2a9e-1b2c-4d3e-8f90-123456789abc";

const recordExchange = (overrides: Partial<RecordedExchange>): RecordedExchange => ({
  method: "GET",
  path: "/api/orders/mine",
  status: 200,
  query: {},
  requestBody: null,
  responseBody: { success: true, message: "Orders.", data: [] },
  ...overrides,
});

describe("normalizeExampleValues", () => {
  it("redacts secrets, tokens and password hashes", () => {
    const [normalized] = normalizeExampleValues([
      {
        accessToken: "abc",
        passwordHash: "$2b$10$abcdef",
        note: "eyJhbGciOiJIUzI1NiJ9.payload.signature",
        apiKey: "live-key",
        permissionKey: "roles:manage",
        hashtag: "ootd",
        signedRequest: "c2lnbmF0dXJl.eyJ1c2VyX2lkIjoiMSJ9",
        nextCursor: "eyJpZCI6IjEyMyJ9",
      },
    ]);
    expect(normalized).toEqual({
      accessToken: "<redacted>",
      passwordHash: "<redacted>",
      note: "<redacted>",
      apiKey: "<redacted>",
      permissionKey: "roles:manage",
      hashtag: "ootd",
      signedRequest: "<redacted>",
      nextCursor: "eyJpZCI6IjEyMyJ9",
    });
  });

  it("swaps ids, emails and times for stable placeholders shared across values", () => {
    const [request, response] = normalizeExampleValues([
      { orderId: ORDER_ID, email: "shopper-x1@example.com" },
      { id: ORDER_ID, createdAt: "2026-11-13T08:15:00.123Z", items: [1, 2, 3, 4] },
    ]);
    expect(request).toEqual({
      orderId: "00000000-0000-4000-8000-000000000001",
      email: "person1@example.com",
    });
    expect(response).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      createdAt: "2026-01-15T09:30:00.000Z",
      items: [1, 2],
    });
  });
});

describe("mergeRecordedExamples", () => {
  const operationKeys = ["GET /api/orders/{orderId}", "GET /api/orders/mine", "POST /api/orders"];

  it("prefers the literal route over a matching path param", () => {
    const examples = mergeRecordedExamples(operationKeys, [recordExchange({})]);
    expect(Object.keys(examples)).toEqual(["GET /api/orders/mine"]);
  });

  it("keeps one example per status, choosing the richest", () => {
    const examples = mergeRecordedExamples(operationKeys, [
      recordExchange({ path: `/api/orders/${ORDER_ID}` }),
      recordExchange({
        path: `/api/orders/${ORDER_ID}`,
        responseBody: { success: true, message: "Order.", data: { id: ORDER_ID, total: 1200 } },
      }),
      recordExchange({
        path: `/api/orders/${ORDER_ID}`,
        status: 404,
        responseBody: { success: false, message: "Not found.", code: "NOT_FOUND" },
      }),
    ]);
    const orderExamples = examples["GET /api/orders/{orderId}"] ?? [];
    expect(orderExamples.map(({ status }) => status)).toEqual([200, 404]);
    expect(orderExamples[0]?.responseBody).toMatchObject({ data: { total: 1200 } });
  });

  it("ignores requests that match no documented operation", () => {
    const examples = mergeRecordedExamples(operationKeys, [
      recordExchange({ method: "DELETE", path: "/api/orders/mine" }),
      recordExchange({ path: "/health" }),
    ]);
    expect(examples).toEqual({});
  });
});

const MINE_OPERATION_KEY = "GET /api/orders/mine";
const OK_STATUS = 200;
const CREATED_STATUS = 201;

const brandExample = (brandName: string, message = "Orders."): EndpointExample => ({
  status: OK_STATUS,
  query: {},
  requestBody: null,
  responseBody: { success: true, message, data: { brandName } },
});

const brandExchange = (brandName: string, handle: string): RecordedExchange =>
  recordExchange({
    responseBody: { success: true, message: "Orders.", data: { brandName, handle } },
  });

describe("toComparableExample", () => {
  it("hides random test suffixes but keeps ordinary words", () => {
    const comparable = toComparableExample(brandExample("Coupon Brand 39cf82 face added"));

    expect(comparable).toContain("Coupon Brand # face added");
  });

  it("treats two examples that differ only in random suffixes as the same", () => {
    expect(toComparableExample(brandExample("Coupon Brand 39cf82"))).toBe(
      toComparableExample(brandExample("Coupon Brand 93ecb7")),
    );
  });
});

describe("mergeRecordedExamples picks the same example on every run", () => {
  it("does not depend on the order the tests happened to run in", () => {
    const firstOrder = mergeRecordedExamples(
      [MINE_OPERATION_KEY],
      [brandExchange("Ram", "group-38c19a39"), brandExchange("Raj", "group-8e1b9324")],
    );
    const secondOrder = mergeRecordedExamples(
      [MINE_OPERATION_KEY],
      [brandExchange("Raj", "group-1accb3a4"), brandExchange("Ram", "group-545a1f04")],
    );

    expect(toComparableExample(firstOrder[MINE_OPERATION_KEY]?.[0] ?? brandExample(""))).toBe(
      toComparableExample(secondOrder[MINE_OPERATION_KEY]?.[0] ?? brandExample("")),
    );
  });
});

describe("keepUnchangedExamples", () => {
  it("keeps the saved example when only random values changed", () => {
    const savedExample = brandExample("Coupon Brand 39cf82");

    const kept = keepUnchangedExamples(
      { [MINE_OPERATION_KEY]: [savedExample] },
      { [MINE_OPERATION_KEY]: [brandExample("Coupon Brand 93ecb7")] },
    );

    expect(kept[MINE_OPERATION_KEY]).toEqual([savedExample]);
  });

  it("takes the new example when the response really changed", () => {
    const changedExample = brandExample("Coupon Brand 93ecb7", "Your orders.");

    const kept = keepUnchangedExamples(
      { [MINE_OPERATION_KEY]: [brandExample("Coupon Brand 39cf82")] },
      { [MINE_OPERATION_KEY]: [changedExample] },
    );

    expect(kept[MINE_OPERATION_KEY]).toEqual([changedExample]);
  });

  it("adds examples for endpoints or statuses that had none", () => {
    const createdExample = { ...brandExample("Coupon Brand 93ecb7"), status: CREATED_STATUS };

    const kept = keepUnchangedExamples(
      { [MINE_OPERATION_KEY]: [brandExample("Coupon Brand 39cf82")] },
      { [MINE_OPERATION_KEY]: [createdExample], "GET /api/cart": [brandExample("Cart 1a2b")] },
    );

    expect(kept[MINE_OPERATION_KEY]).toEqual([createdExample]);
    expect(kept["GET /api/cart"]).toEqual([brandExample("Cart 1a2b")]);
  });

  it("drops examples for endpoints the new recording no longer has", () => {
    const kept = keepUnchangedExamples(
      { "GET /api/removed": [brandExample("Old 1a2b")] },
      { [MINE_OPERATION_KEY]: [brandExample("Coupon Brand 93ecb7")] },
    );

    expect(kept).not.toHaveProperty("GET /api/removed");
  });
});
