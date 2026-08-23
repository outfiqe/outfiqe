import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "#config/env.config.js";

const SIGNED_REQUEST_ALGORITHM = "HMAC-SHA256";
const SIGNED_REQUEST_SEGMENT_COUNT = 2;

type FacebookSignedRequestPayload = {
  algorithm: string;
  issued_at: number;
  user_id: string;
};

const base64UrlDecode = (input: string): Buffer => {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
};

export const parseFacebookSignedRequest = (signedRequest: string): { userId: string } | null => {
  const segments = signedRequest.split(".");
  if (segments.length !== SIGNED_REQUEST_SEGMENT_COUNT) return null;

  const [encodedSignature, encodedPayload] = segments;
  if (!encodedSignature || !encodedPayload) return null;

  const expectedSignature = createHmac("sha256", env.FACEBOOK_APP_SECRET)
    .update(encodedPayload)
    .digest();
  const providedSignature = base64UrlDecode(encodedSignature);

  if (providedSignature.length !== expectedSignature.length) return null;
  if (!timingSafeEqual(providedSignature, expectedSignature)) return null;

  let payload: FacebookSignedRequestPayload;
  try {
    payload = JSON.parse(
      base64UrlDecode(encodedPayload).toString("utf8"),
    ) as FacebookSignedRequestPayload;
  } catch {
    return null;
  }

  if (payload.algorithm !== SIGNED_REQUEST_ALGORITHM || !payload.user_id) return null;

  return { userId: payload.user_id };
};
