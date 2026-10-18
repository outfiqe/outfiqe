import { describe, expect, it } from "vitest";

import {
  isValidPartnerSignature,
  isValidPartnerToken,
  signPartnerWebhookBody,
} from "./partner-webhook.signature.js";

const CURRENT_SECRET = "current-secret-0123456789";
const PREVIOUS_SECRET = "previous-secret-0123456789";
const BODY = Buffer.from('{"events":[{"reference":"PX-1","status":"Delivered"}]}');

describe("isValidPartnerSignature", () => {
  it("accepts a signature made with the current or the previous secret", () => {
    expect(
      isValidPartnerSignature(BODY, signPartnerWebhookBody(BODY, CURRENT_SECRET), [
        CURRENT_SECRET,
        PREVIOUS_SECRET,
      ]),
    ).toBe(true);
    expect(
      isValidPartnerSignature(BODY, signPartnerWebhookBody(BODY, PREVIOUS_SECRET).toUpperCase(), [
        CURRENT_SECRET,
        PREVIOUS_SECRET,
      ]),
    ).toBe(true);
  });

  it("rejects a wrong, missing or truncated signature, or a changed body", () => {
    const signature = signPartnerWebhookBody(BODY, CURRENT_SECRET);

    expect(
      isValidPartnerSignature(BODY, signPartnerWebhookBody(BODY, "x".repeat(20)), [CURRENT_SECRET]),
    ).toBe(false);
    expect(isValidPartnerSignature(BODY, undefined, [CURRENT_SECRET])).toBe(false);
    expect(isValidPartnerSignature(BODY, signature.slice(0, 10), [CURRENT_SECRET])).toBe(false);
    expect(isValidPartnerSignature(Buffer.from("{}"), signature, [CURRENT_SECRET])).toBe(false);
  });

  it("rejects everything when no secret is set", () => {
    expect(
      isValidPartnerSignature(BODY, signPartnerWebhookBody(BODY, CURRENT_SECRET), [null, null]),
    ).toBe(false);
  });
});

describe("isValidPartnerToken", () => {
  it("compares the header token with each secret", () => {
    expect(isValidPartnerToken(CURRENT_SECRET, [CURRENT_SECRET, null])).toBe(true);
    expect(isValidPartnerToken(PREVIOUS_SECRET, [CURRENT_SECRET, PREVIOUS_SECRET])).toBe(true);
    expect(isValidPartnerToken("guess", [CURRENT_SECRET])).toBe(false);
    expect(isValidPartnerToken(undefined, [CURRENT_SECRET])).toBe(false);
  });
});
