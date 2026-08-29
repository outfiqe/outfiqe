import { describe, expect, it } from "vitest";

import { CreatorStatus, UserRole } from "../types";
import { brandUserSchema, customerUserSchema, toUserSession } from "./userSchemas";

describe("toUserSession", () => {
  it("carries the handle through for a customer/creator user", () => {
    const user = customerUserSchema.parse({
      id: "user-1",
      name: "Sabin Shrestha",
      handle: "sabinshrestha0",
      email: "creator1@example.com",
      phone: "9812345678",
      avatarUrl: null,
      role: UserRole.CUSTOMER,
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
      hasPassword: true,
    });

    expect(toUserSession(user).handle).toBe("sabinshrestha0");
  });

  it("leaves the handle undefined when the API response omits it", () => {
    const user = customerUserSchema.parse({
      id: "user-1",
      name: "Sabin Shrestha",
      email: "creator1@example.com",
      phone: null,
      avatarUrl: null,
      role: UserRole.CUSTOMER,
      isCreator: false,
      creatorStatus: CreatorStatus.NONE,
      hasPassword: true,
    });

    expect(toUserSession(user).handle).toBeUndefined();
  });

  it("leaves the handle undefined for a brand user, which has no handle field", () => {
    const user = brandUserSchema.parse({
      id: "brand-user-1",
      name: "Brand Owner",
      email: "owner@brand.com",
      phone: null,
      avatarUrl: null,
      role: UserRole.BRAND_OWNER,
      brandId: "brand-1",
    });

    expect(toUserSession(user).handle).toBeUndefined();
  });

  it("carries a brand user's real phone number through, instead of always reporting none", () => {
    const user = brandUserSchema.parse({
      id: "brand-user-1",
      name: "Brand Owner",
      email: "owner@brand.com",
      phone: "9828282824",
      avatarUrl: null,
      role: UserRole.BRAND_OWNER,
      brandId: "brand-1",
    });

    expect(toUserSession(user).phone).toBe("9828282824");
  });
});
