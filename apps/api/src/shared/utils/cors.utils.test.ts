import { describe, expect, it } from "vitest";

import { isTenantOrigin } from "./cors.utils.js";

describe("isTenantOrigin", () => {
  it("allows the bare base domain", () => {
    expect(isTenantOrigin("http://localhost:3000", "localhost")).toBe(true);
  });

  it("allows any subdomain of the base domain", () => {
    expect(isTenantOrigin("https://acme.outfiqe.com", "outfiqe.com")).toBe(true);
    expect(isTenantOrigin("http://acme.localhost:3000", "localhost")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isTenantOrigin("https://Acme.Outfiqe.com", "outfiqe.com")).toBe(true);
  });

  it("rejects an origin outside the base domain", () => {
    expect(isTenantOrigin("https://evil.example.com", "outfiqe.com")).toBe(false);
  });

  it("rejects a malformed origin", () => {
    expect(isTenantOrigin("not-a-url", "outfiqe.com")).toBe(false);
  });
});
