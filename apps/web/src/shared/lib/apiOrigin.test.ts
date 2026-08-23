import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_LOCAL_API_ORIGIN, getPublicApiOrigin } from "./apiOrigin";

describe("getPublicApiOrigin", () => {
  const originalSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SOCKET_URL = originalSocketUrl;
  });

  it("falls back to the local default when unset", () => {
    delete process.env.NEXT_PUBLIC_SOCKET_URL;
    expect(getPublicApiOrigin()).toBe(DEFAULT_LOCAL_API_ORIGIN);
  });

  it("returns the configured origin when set", () => {
    process.env.NEXT_PUBLIC_SOCKET_URL = "https://api.outfiqe.com";
    expect(getPublicApiOrigin()).toBe("https://api.outfiqe.com");
  });
});
