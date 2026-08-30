import { afterEach, describe, expect, it } from "vitest";

import { isOnTenantHost } from "./tenantHost";

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
    setHostname("studio.outfiqe.local");

    expect(isOnTenantHost()).toBe(true);
  });

  it("is false on the bare base domain", () => {
    setHostname("outfiqe.local");

    expect(isOnTenantHost()).toBe(false);
  });

  it("is false on a reserved subdomain", () => {
    setHostname("admin.outfiqe.local");

    expect(isOnTenantHost()).toBe(false);
  });
});
