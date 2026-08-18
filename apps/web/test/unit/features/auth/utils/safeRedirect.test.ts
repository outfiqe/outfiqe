import { describe, expect, it } from "vitest";

import { getSafeRedirect } from "@/features/auth/utils/safeRedirect";

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
    expect(getSafeRedirect("/dashboard/orders")).toBe("/dashboard/orders");
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
