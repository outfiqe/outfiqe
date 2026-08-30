import { isTenantHost } from "@outfiqe/utils";
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useTenantHost } from "./useTenantHost";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? "localhost";

const originalLocation = window.location;

const setHostname = (hostname: string) => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...originalLocation, hostname },
  });
};

afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
});

describe("isTenantHost", () => {
  it("accepts a real subdomain of the base domain", () => {
    expect(isTenantHost("studio.outfiqe.local", "outfiqe.local")).toBe(true);
    expect(isTenantHost("acme-corp.outfiqe.local:3000", "outfiqe.local")).toBe(true);
  });

  it("rejects the bare base domain and unrelated hosts", () => {
    expect(isTenantHost("outfiqe.local", "outfiqe.local")).toBe(false);
    expect(isTenantHost("evil.example.com", "outfiqe.local")).toBe(false);
  });

  it("rejects reserved and malformed subdomains", () => {
    expect(isTenantHost("www.outfiqe.local", "outfiqe.local")).toBe(false);
    expect(isTenantHost("admin.outfiqe.local", "outfiqe.local")).toBe(false);
    expect(isTenantHost("-bad.outfiqe.local", "outfiqe.local")).toBe(false);
  });
});

describe("useTenantHost", () => {
  it("is true on a tenant subdomain of the base domain", () => {
    setHostname(`studio.${BASE_DOMAIN}`);

    const { result } = renderHook(() => useTenantHost());

    expect(result.current).toBe(true);
  });

  it("is false on the bare base domain", () => {
    setHostname(BASE_DOMAIN);

    const { result } = renderHook(() => useTenantHost());

    expect(result.current).toBe(false);
  });

  it("is false on a reserved subdomain", () => {
    setHostname(`www.${BASE_DOMAIN}`);

    const { result } = renderHook(() => useTenantHost());

    expect(result.current).toBe(false);
  });
});
