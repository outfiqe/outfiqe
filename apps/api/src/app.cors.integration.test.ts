import request from "supertest";
import { describe, expect, it } from "vitest";

import { testApp } from "#test/integration/test-app.js";

const ALLOWED_TENANT_ORIGIN = "http://localhost:3000";
const DISALLOWED_ORIGIN = "https://evil.example";
const TENANT_SUFFIX_SPOOF_ORIGIN = "http://localhost.evil.example";

describe("CORS origin handling", () => {
  it("reflects an allowed tenant origin with credentials", async () => {
    const response = await request(testApp).get("/health").set("Origin", ALLOWED_TENANT_ORIGIN);

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(ALLOWED_TENANT_ORIGIN);
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("rejects a disallowed origin without a 500 and without the allow-origin header", async () => {
    const response = await request(testApp).get("/health").set("Origin", DISALLOWED_ORIGIN);

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("does not treat an origin that merely ends with the base domain's text as a tenant", async () => {
    const response = await request(testApp)
      .get("/health")
      .set("Origin", TENANT_SUFFIX_SPOOF_ORIGIN);

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
