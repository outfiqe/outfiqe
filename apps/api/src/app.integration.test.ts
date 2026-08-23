import request from "supertest";
import { describe, expect, it } from "vitest";

import { testApp } from "./testing/integration/testApp.js";

describe("security headers", () => {
  it("sets HSTS, a locked-down CSP, and clickjacking protection on every response", async () => {
    const response = await request(testApp).get("/health");

    expect(response.headers["strict-transport-security"]).toBe(
      "max-age=31536000; includeSubDomains; preload",
    );
    expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(response.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });
});
