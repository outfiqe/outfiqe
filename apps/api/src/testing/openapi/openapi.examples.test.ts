import { describe, expect, it } from "vitest";

import { normalizeExampleValues } from "./openapi.example-normalizer.js";
import { mergeRecordedExamples } from "./openapi.examples.js";
import type { RecordedExchange } from "./openapi.types.js";

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
