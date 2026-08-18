import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";

describe("generateOpaqueToken", () => {
  it("returns a 128-character hex string (64 bytes)", () => {
    const token = generateOpaqueToken();

    expect(token).toMatch(/^[0-9a-f]{128}$/);
  });

  it("returns a different token on every call", () => {
    const first = generateOpaqueToken();
    const second = generateOpaqueToken();

    expect(first).not.toBe(second);
  });
});

describe("hashToken", () => {
  it("deterministically hashes the same input to the same output", () => {
    const token = generateOpaqueToken();

    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("matches a sha256 hex digest of the raw token", () => {
    const token = "known-input";

    expect(hashToken(token)).toBe(createHash("sha256").update(token).digest("hex"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });
});
