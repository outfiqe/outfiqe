import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { env } from "#config/env.config.js";

import { parseFacebookSignedRequest } from "./facebook.webhooks.utils.js";

const base64UrlEncode = (input: Buffer): string =>
  input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const buildSignedRequest = (payload: unknown, secret = env.FACEBOOK_APP_SECRET): string => {
  const encodedPayload = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const signature = createHmac("sha256", secret).update(encodedPayload).digest();
  return `${base64UrlEncode(signature)}.${encodedPayload}`;
};

const VALID_PAYLOAD = { algorithm: "HMAC-SHA256", issued_at: 1700000000, user_id: "fb-user-123" };

describe("parseFacebookSignedRequest", () => {
  it("parses a validly signed request", () => {
    const signedRequest = buildSignedRequest(VALID_PAYLOAD);

    expect(parseFacebookSignedRequest(signedRequest)).toEqual({ userId: "fb-user-123" });
  });

  it("rejects a request signed with the wrong secret", () => {
    const signedRequest = buildSignedRequest(VALID_PAYLOAD, "a-completely-different-secret");

    expect(parseFacebookSignedRequest(signedRequest)).toBeNull();
  });

  it("rejects a request whose signature was tampered with", () => {
    const signedRequest = buildSignedRequest(VALID_PAYLOAD);
    const [, encodedPayload] = signedRequest.split(".");
    const tamperedSignature = base64UrlEncode(Buffer.from("not-the-real-signature"));

    expect(parseFacebookSignedRequest(`${tamperedSignature}.${encodedPayload}`)).toBeNull();
  });

  it("rejects a request whose payload was tampered with after signing", () => {
    const signedRequest = buildSignedRequest(VALID_PAYLOAD);
    const [encodedSignature] = signedRequest.split(".");
    const tamperedPayload = base64UrlEncode(
      Buffer.from(JSON.stringify({ ...VALID_PAYLOAD, user_id: "attacker-controlled-id" })),
    );

    expect(parseFacebookSignedRequest(`${encodedSignature}.${tamperedPayload}`)).toBeNull();
  });

  it("rejects an unexpected algorithm", () => {
    const signedRequest = buildSignedRequest({ ...VALID_PAYLOAD, algorithm: "none" });

    expect(parseFacebookSignedRequest(signedRequest)).toBeNull();
  });

  it("rejects a payload missing user_id", () => {
    const signedRequest = buildSignedRequest({ algorithm: "HMAC-SHA256", issued_at: 1700000000 });

    expect(parseFacebookSignedRequest(signedRequest)).toBeNull();
  });

  it("rejects malformed input with the wrong number of segments", () => {
    expect(parseFacebookSignedRequest("only-one-segment")).toBeNull();
    expect(parseFacebookSignedRequest("too.many.segments")).toBeNull();
  });

  it("rejects a payload segment that isn't valid json", () => {
    const encodedPayload = base64UrlEncode(Buffer.from("not json"));
    const signature = createHmac("sha256", env.FACEBOOK_APP_SECRET).update(encodedPayload).digest();

    expect(
      parseFacebookSignedRequest(`${base64UrlEncode(signature)}.${encodedPayload}`),
    ).toBeNull();
  });
});
