import { describe, expect, it } from "vitest";

import { resolveLoginOrigin } from "./ProtectedRoute.utils";

describe("resolveLoginOrigin", () => {
  it("preserves the current subdomain when it belongs to the configured domain", () => {
    expect(resolveLoginOrigin("http://outfiqe.local:3000", "daraz.outfiqe.local")).toBe(
      "http://daraz.outfiqe.local:3000",
    );
  });

  it("keeps the bare configured domain when the current host has no subdomain", () => {
    expect(resolveLoginOrigin("http://outfiqe.local:3000", "outfiqe.local")).toBe(
      "http://outfiqe.local:3000",
    );
  });

  it("falls back to the configured URL when running on an unrelated host, e.g. a standalone dev server", () => {
    expect(resolveLoginOrigin("http://outfiqe.local:3000", "localhost")).toBe(
      "http://outfiqe.local:3000",
    );
  });

  it("carries no port when the configured URL doesn't have one", () => {
    expect(resolveLoginOrigin("https://outfiqe.com", "daraz.outfiqe.com")).toBe(
      "https://daraz.outfiqe.com",
    );
  });
});
