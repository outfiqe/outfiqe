import { describe, expect, it } from "vitest";

import {
  decryptAccountNumber,
  encryptAccountNumber,
  lastFourDigits,
} from "./account-number-encryption.utils.js";

describe("encryptAccountNumber / decryptAccountNumber", () => {
  it("round-trips an account number through encryption and decryption", () => {
    const ciphertext = encryptAccountNumber("1234567890");
    expect(ciphertext).not.toContain("1234567890");
    expect(decryptAccountNumber(ciphertext)).toBe("1234567890");
  });

  it("throws for a ciphertext envelope that isn't the expected iv.authTag.ciphertext shape", () => {
    expect(() => decryptAccountNumber("not-a-valid-envelope")).toThrow(
      "This bank account's stored data is corrupt and can't be decrypted.",
    );
  });
});

describe("lastFourDigits", () => {
  it("returns the last 4 characters of the account number", () => {
    expect(lastFourDigits("1234567890")).toBe("7890");
  });
});
