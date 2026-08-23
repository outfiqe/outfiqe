import { describe, expect, it } from "vitest";

import { sanitizeOAuthRedirectPath } from "./oauth.utils.js";

describe("sanitizeOAuthRedirectPath", () => {
  it("returns the candidate unchanged when it is a same-origin relative path", () => {
    expect(sanitizeOAuthRedirectPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeOAuthRedirectPath("/dashboard/settings?tab=security")).toBe(
      "/dashboard/settings?tab=security",
    );
  });

  it("falls back to the site root when the candidate is undefined or empty", () => {
    expect(sanitizeOAuthRedirectPath(undefined)).toBe("/");
    expect(sanitizeOAuthRedirectPath("")).toBe("/");
  });

  it("falls back to the site root for an absolute url, guarding against open redirects", () => {
    expect(sanitizeOAuthRedirectPath("https://evil.example/steal")).toBe("/");
    expect(sanitizeOAuthRedirectPath("http://evil.example")).toBe("/");
  });

  it("falls back to the site root for a protocol-relative url", () => {
    expect(sanitizeOAuthRedirectPath("//evil.example/steal")).toBe("/");
  });

  it("falls back to the site root for a backslash-prefixed path some browsers treat as protocol-relative", () => {
    expect(sanitizeOAuthRedirectPath("/\\evil.example")).toBe("/");
  });

  it("falls back to the site root for a path with no leading slash", () => {
    expect(sanitizeOAuthRedirectPath("dashboard")).toBe("/");
  });
});
