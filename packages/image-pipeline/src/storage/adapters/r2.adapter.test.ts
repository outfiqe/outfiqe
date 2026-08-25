import { describe, expect, it } from "vitest";

import { R2StorageAdapter } from "./r2.adapter.js";

const buildAdapter = () =>
  new R2StorageAdapter({
    accountId: "test-account",
    bucket: "test-bucket",
    accessKeyId: "test-key",
    secretAccessKey: "test-secret",
  });

describe("R2StorageAdapter (stub)", () => {
  it("throws on put()", async () => {
    await expect(buildAdapter().put("key", Buffer.from("x"))).rejects.toThrow(/not implemented/);
  });

  it("throws on get()", async () => {
    await expect(buildAdapter().get("key")).rejects.toThrow(/not implemented/);
  });

  it("throws on delete()", async () => {
    await expect(buildAdapter().delete("key")).rejects.toThrow(/not implemented/);
  });

  it("throws on exists()", async () => {
    await expect(buildAdapter().exists("key")).rejects.toThrow(/not implemented/);
  });

  it("throws on getSignedUrl()", async () => {
    await expect(buildAdapter().getSignedUrl("key")).rejects.toThrow(/not implemented/);
  });
});
