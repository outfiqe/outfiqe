import { describe, expect, it } from "vitest";

import { isPrivatePath } from "./privatePaths";

describe("isPrivatePath", () => {
  it.each([
    "/cart",
    "/checkout",
    "/orders",
    "/orders/abc123",
    "/wallet",
    "/withdraw",
    "/messages/conversation-1",
    "/settings/security",
    "/profile",
    "/login",
  ])("keeps %s out of the offline cache", (pathname) => {
    expect(isPrivatePath(pathname)).toBe(true);
  });

  it.each(["/", "/shop", "/explore", "/brands", "/collections", "/product/123", "/offline"])(
    "allows %s to be saved for offline reading",
    (pathname) => {
      expect(isPrivatePath(pathname)).toBe(false);
    },
  );

  it("does not treat a public path that merely starts with the same letters as private", () => {
    expect(isPrivatePath("/cartoons")).toBe(false);
    expect(isPrivatePath("/settings-guide")).toBe(false);
  });
});
