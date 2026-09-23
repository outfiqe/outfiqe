import { afterEach, describe, expect, it } from "vitest";

import { buildTenantOrigin, isOnTenantHost } from "./tenantHost";

const BASE_DOMAIN = import.meta.env.VITE_TENANT_BASE_DOMAIN ?? "localhost";

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

describe("isOnTenantHost", () => {
  it("is true on a tenant subdomain of the base domain", () => {
    setHostname(`studio.${BASE_DOMAIN}`);

    expect(isOnTenantHost()).toBe(true);
  });

  it("is false on the bare base domain", () => {
    setHostname(BASE_DOMAIN);

    expect(isOnTenantHost()).toBe(false);
  });

  it("is false on a reserved subdomain", () => {
    setHostname(`admin.${BASE_DOMAIN}`);

    expect(isOnTenantHost()).toBe(false);
  });
});

describe("buildTenantOrigin", () => {
  it("swaps the hostname for the given subdomain, keeping the current protocol and port", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        protocol: "https:",
        port: "",
        hostname: `admin.${BASE_DOMAIN}`,
      },
    });

    expect(buildTenantOrigin("studio")).toBe(`https://studio.${BASE_DOMAIN}`);
  });

  it("preserves a non-default port for local development", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, protocol: "http:", port: "5173", hostname: BASE_DOMAIN },
    });

    expect(buildTenantOrigin("studio")).toBe(`http://studio.${BASE_DOMAIN}:5173`);
  });
});
