import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LEN = 64;

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, KEY_LEN);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
};

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const [scheme, saltHex, hashHex] = stored.split(":");

  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const derived = await scryptAsync(password, Buffer.from(saltHex, "hex"), KEY_LEN);
  const expected = Buffer.from(hashHex, "hex");
  const hasEqualLen = derived.length === expected.length;

  return hasEqualLen && timingSafeEqual(derived, expected);
};
