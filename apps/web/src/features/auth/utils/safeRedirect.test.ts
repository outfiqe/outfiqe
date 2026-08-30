import { describe, expect, it } from "vitest";

import {
  getSafeRedirect,
  isAdminAppTarget,
  resolveLoginDestination,
} from "@/features/auth/utils/safeRedirect";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "/admin";

describe("getSafeRedirect", () => {
  it("returns null for a null or undefined value", () => {
    expect(getSafeRedirect(null)).toBeNull();
    expect(getSafeRedirect(undefined)).toBeNull();
  });

  it("allows the configured admin URL through unchanged", () => {
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? "/admin";
    expect(getSafeRedirect(adminUrl)).toBe(adminUrl);
  });

  it("allows a same-app relative path", () => {
    expect(getSafeRedirect("/manage-orders")).toBe("/manage-orders");
  });

  it("rejects a protocol-relative URL (open-redirect attempt)", () => {
    expect(getSafeRedirect("//evil.com")).toBeNull();
  });

  it("rejects a value that doesn't start with a slash", () => {
    expect(getSafeRedirect("https://evil.com")).toBeNull();
  });

  it("rejects a value containing a backslash", () => {
    expect(getSafeRedirect("/\\evil.com")).toBeNull();
  });

  it("rejects the auth screens to avoid redirect loops", () => {
    expect(getSafeRedirect("/login")).toBeNull();
    expect(getSafeRedirect("/register")).toBeNull();
  });
});

describe("isAdminAppTarget", () => {
  it("matches the admin root and any path under it", () => {
    expect(isAdminAppTarget(ADMIN_URL)).toBe(true);
    expect(isAdminAppTarget(`${ADMIN_URL}/crm`)).toBe(true);
  });

  it("does not match a storefront path", () => {
    expect(isAdminAppTarget("/profile")).toBe(false);
    expect(isAdminAppTarget("/administrators")).toBe(false);
  });
});

describe("resolveLoginDestination", () => {
  it("falls back to the default route when no redirect was requested", () => {
    expect(resolveLoginDestination(null, "/profile", true)).toBe("/profile");
  });

  it("honours a storefront redirect regardless of the host", () => {
    expect(resolveLoginDestination("/checkout", "/profile", false)).toBe("/checkout");
  });

  it("honours a cross-app admin redirect only on a tenant host", () => {
    expect(resolveLoginDestination(`${ADMIN_URL}/crm`, "/profile", true)).toBe(`${ADMIN_URL}/crm`);
    expect(resolveLoginDestination(`${ADMIN_URL}/crm`, "/profile", false)).toBe("/profile");
  });
});
