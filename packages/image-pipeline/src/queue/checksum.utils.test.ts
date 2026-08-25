import { describe, expect, it } from "vitest";

import { computeChecksum } from "./checksum.utils.js";

describe("computeChecksum", () => {
  it("is deterministic for identical buffers", () => {
    const buffer = Buffer.from("same content");
    expect(computeChecksum(buffer)).toBe(computeChecksum(Buffer.from("same content")));
  });

  it("differs for different content", () => {
    expect(computeChecksum(Buffer.from("a"))).not.toBe(computeChecksum(Buffer.from("b")));
  });

  it("returns a 64-character hex sha256 digest", () => {
    const digest = computeChecksum(Buffer.from("x"));
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });
});
