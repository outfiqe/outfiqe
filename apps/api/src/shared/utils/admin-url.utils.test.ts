import { describe, expect, it } from "vitest";

import { isOnReservedTenantSubdomain } from "./admin-url.utils.js";

const BASE_DOMAIN = "outfiqe.com";

describe("isOnReservedTenantSubdomain", () => {
  it("flags an admin URL on the reserved admin subdomain", () => {
    expect(isOnReservedTenantSubdomain("https://admin.outfiqe.com/admin", BASE_DOMAIN)).toBe(true);
  });

  it("flags other reserved subdomains regardless of casing", () => {
    expect(isOnReservedTenantSubdomain("https://WWW.Outfiqe.com/admin", BASE_DOMAIN)).toBe(true);
  });

  it("accepts the bare base domain", () => {
    expect(isOnReservedTenantSubdomain("https://outfiqe.com/admin", BASE_DOMAIN)).toBe(false);
  });

  it("accepts a local development host that is not under the base domain", () => {
    expect(isOnReservedTenantSubdomain("http://localhost:3000/admin", BASE_DOMAIN)).toBe(false);
  });
});
