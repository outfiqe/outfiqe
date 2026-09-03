import { describe, expect, it } from "vitest";

import { UserRole } from "../types";
import { ADMIN_URL, getDefaultRouteForUser } from "./getDefaultRoute";

describe("getDefaultRouteForUser", () => {
  it("sends an admin to the admin app", () => {
    expect(getDefaultRouteForUser({ role: UserRole.ADMIN })).toBe(ADMIN_URL);
  });

  it("sends a brand owner to the overview dashboard", () => {
    expect(getDefaultRouteForUser({ role: UserRole.BRAND_OWNER })).toBe("/overview");
  });

  it("sends a shopper to the overview dashboard", () => {
    expect(getDefaultRouteForUser({ role: UserRole.CUSTOMER })).toBe("/overview");
  });
});
