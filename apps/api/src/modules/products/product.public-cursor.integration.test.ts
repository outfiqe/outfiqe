import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { encodeCursor } from "#lib/pagination.utils.js";
import { testApp } from "#test/integration/test-app.js";

describe("GET /api/products — cursor validation", () => {
  it("rejects a cursor that is neither an id nor an encoded cursor", async () => {
    const response = await request(testApp).get("/api/products?cursor=garbage");

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a cursor longer than any this API issues", async () => {
    const response = await request(testApp).get(`/api/products?cursor=${"a".repeat(600)}`);

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
  });

  it("accepts an id cursor", async () => {
    const response = await request(testApp).get(`/api/products?cursor=${randomUUID()}`);

    expect(response.status).toBe(HTTP_STATUS.OK);
  });

  it("accepts the offset cursor a search page hands out", async () => {
    const searchOffsetCursor = encodeCursor({ offset: 0 });

    const response = await request(testApp).get(
      `/api/products?q=shirt&cursor=${searchOffsetCursor}`,
    );

    expect(response.status).toBe(HTTP_STATUS.OK);
  });
});

describe("request bodies the JSON parser rejects", () => {
  it("answers malformed JSON with a 400", async () => {
    const response = await request(testApp)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{not json");

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(response.body.code).toBe("INVALID_JSON");
  });
});
