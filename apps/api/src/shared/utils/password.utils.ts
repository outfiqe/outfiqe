import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LEN = 64;
const LEGACY_SCRYPT_SCHEME = "scrypt";
const ARGON2ID_PREFIX = "$argon2id$";

export const hashPassword = async (password: string): Promise<string> => argon2Hash(password);

const verifyLegacyScryptPassword = async (password: string, stored: string): Promise<boolean> => {
  const [scheme, saltHex, hashHex] = stored.split(":");

  if (scheme !== LEGACY_SCRYPT_SCHEME || !saltHex || !hashHex) return false;

  const derived = await scryptAsync(password, Buffer.from(saltHex, "hex"), KEY_LEN);
  const expected = Buffer.from(hashHex, "hex");
  const hasEqualLen = derived.length === expected.length;

  return hasEqualLen && timingSafeEqual(derived, expected);
};

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  if (stored.startsWith(ARGON2ID_PREFIX)) {
    return argon2Verify(stored, password);
  }

  return verifyLegacyScryptPassword(password, stored);
};

export const needsRehash = (stored: string): boolean => !stored.startsWith(ARGON2ID_PREFIX);
