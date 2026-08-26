import { describe, expect, it } from "vitest";

import { isAllowedOrigin, isTenantOrigin } from "./cors.utils.js";

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

describe("isAllowedOrigin", () => {
  const allowedOrigins = ["http://localhost:5173"];
  const tenantBaseDomain = "outfiqe.local";

  it("allows a request with no origin (same-origin/non-browser clients)", () => {
    expect(isAllowedOrigin(undefined, allowedOrigins, tenantBaseDomain)).toBe(true);
  });

  it("allows an origin from the static allowlist", () => {
    expect(isAllowedOrigin("http://localhost:5173", allowedOrigins, tenantBaseDomain)).toBe(true);
  });

  it("allows the tenant base domain and its subdomains", () => {
    expect(isAllowedOrigin("http://outfiqe.local:3000", allowedOrigins, tenantBaseDomain)).toBe(
      true,
    );
    expect(
      isAllowedOrigin("http://daraz.outfiqe.local:3000", allowedOrigins, tenantBaseDomain),
    ).toBe(true);
  });

  it("rejects an origin that is neither allowlisted nor a tenant subdomain", () => {
    expect(isAllowedOrigin("https://evil.example.com", allowedOrigins, tenantBaseDomain)).toBe(
      false,
    );
  });
});
