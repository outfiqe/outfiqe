import { afterEach, describe, expect, it } from "vitest";

import { isOnTenantHost } from "./tenantHost";

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
