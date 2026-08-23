import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { hashPassword, needsRehash, verifyPassword } from "#lib/password.utils.js";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const LEGACY_SCRYPT_KEY_LEN = 64;

const hashLegacyScryptPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, LEGACY_SCRYPT_KEY_LEN);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
};

describe("hashPassword", () => {
  it("produces an argon2id-encoded hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");

    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it("produces a different hash for the same password on each call (random salt)", async () => {
    const first = await hashPassword("correct-horse-battery-staple");
    const second = await hashPassword("correct-horse-battery-staple");

    expect(first).not.toBe(second);
  });
});

describe("verifyPassword", () => {
  it("verifies a correct password against its argon2id hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");

    await expect(verifyPassword("correct-horse-battery-staple", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password against an argon2id hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");

    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("still verifies a correct password against a legacy scrypt hash", async () => {
    const hash = await hashLegacyScryptPassword("correct-horse-battery-staple");

    await expect(verifyPassword("correct-horse-battery-staple", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password against a legacy scrypt hash", async () => {
    const hash = await hashLegacyScryptPassword("correct-horse-battery-staple");

    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("rejects a malformed stored hash", async () => {
    await expect(verifyPassword("anything", "not-a-real-hash")).resolves.toBe(false);
  });
});

describe("needsRehash", () => {
  it("returns false for a fresh argon2id hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");

    expect(needsRehash(hash)).toBe(false);
  });

  it("returns true for a legacy scrypt hash", async () => {
    const hash = await hashLegacyScryptPassword("correct-horse-battery-staple");

    expect(needsRehash(hash)).toBe(true);
  });
});
