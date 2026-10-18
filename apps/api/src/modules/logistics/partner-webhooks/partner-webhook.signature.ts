import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_ALGORITHM = "sha256";
const SIGNATURE_ENCODING = "hex";

const isSameSecretValue = (expected: string, received: string): boolean => {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
};

export const signPartnerWebhookBody = (rawBody: Buffer, secret: string): string =>
  createHmac(SIGNATURE_ALGORITHM, secret).update(rawBody).digest(SIGNATURE_ENCODING);

export const isValidPartnerSignature = (
  rawBody: Buffer,
  receivedSignature: string | undefined,
  secrets: readonly (string | null)[],
): boolean => {
  if (!receivedSignature) return false;
  const normalizedSignature = receivedSignature.trim().toLowerCase();
  return secrets.some(
    (secret) =>
      secret !== null &&
      isSameSecretValue(signPartnerWebhookBody(rawBody, secret), normalizedSignature),
  );
};

export const isValidPartnerToken = (
  receivedToken: string | undefined,
  secrets: readonly (string | null)[],
): boolean => {
  if (!receivedToken) return false;
  return secrets.some((secret) => secret !== null && isSameSecretValue(secret, receivedToken));
};
