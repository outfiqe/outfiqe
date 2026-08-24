import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "#config/env.config.js";
import { AppError } from "#middlewares/error-handler.js";

const AES_ALGORITHM = "aes-256-gcm";
const GCM_IV_BYTES = 12;
const CIPHERTEXT_SEGMENT_COUNT = 3;
const LAST_FOUR_DIGITS = 4;
const CORRUPT_CIPHERTEXT_STATUS = 500;

const encryptionKey = Buffer.from(env.BANK_ACCOUNT_ENCRYPTION_KEY, "hex");

export const encryptAccountNumber = (accountNumber: string): string => {
  const iv = randomBytes(GCM_IV_BYTES);
  const cipher = createCipheriv(AES_ALGORITHM, encryptionKey, iv);

  const ciphertext = Buffer.concat([cipher.update(accountNumber, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, ciphertext].map((segment) => segment.toString("base64")).join(".");
};

export const decryptAccountNumber = (ciphertextEnvelope: string): string => {
  const segments = ciphertextEnvelope.split(".");
  if (segments.length !== CIPHERTEXT_SEGMENT_COUNT) {
    throw new AppError(
      "CORRUPT_BANK_ACCOUNT_CIPHERTEXT",
      "This bank account's stored data is corrupt and can't be decrypted.",
      CORRUPT_CIPHERTEXT_STATUS,
    );
  }
  const [ivSegment, authTagSegment, ciphertextSegment] = segments as [string, string, string];

  const decipher = createDecipheriv(AES_ALGORITHM, encryptionKey, Buffer.from(ivSegment, "base64"));
  decipher.setAuthTag(Buffer.from(authTagSegment, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextSegment, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
};

export const lastFourDigits = (accountNumber: string): string =>
  accountNumber.slice(-LAST_FOUR_DIGITS);
