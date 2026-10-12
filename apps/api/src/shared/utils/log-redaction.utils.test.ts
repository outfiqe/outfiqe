import { describe, expect, it } from "vitest";

import { redactSensitiveQueryParams, redactSensitiveQueryString } from "./log-redaction.utils.js";

describe("redactSensitiveQueryParams", () => {
  it("hides height and weight but keeps the other parameters", () => {
    expect(
      redactSensitiveQueryParams("/api/products/fits?heightCm=172&type=kurta&weightKg=68&limit=12"),
    ).toBe("/api/products/fits?heightCm=[redacted]&type=kurta&weightKg=[redacted]&limit=12");
  });

  it("leaves a URL without a query string alone", () => {
    expect(redactSensitiveQueryParams("/api/products/123")).toBe("/api/products/123");
  });

  it("leaves a URL without sensitive parameters alone", () => {
    expect(redactSensitiveQueryParams("/api/products?type=kurta&sort=newest")).toBe(
      "/api/products?type=kurta&sort=newest",
    );
  });
});

describe("redactSensitiveQueryString", () => {
  it("redacts a bare query string", () => {
    expect(redactSensitiveQueryString("weightKg=68")).toBe("weightKg=[redacted]");
  });

  it("keeps an empty query string empty", () => {
    expect(redactSensitiveQueryString("")).toBe("");
  });
});
