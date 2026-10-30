import type { CaptureResult } from "posthog-js";
import { describe, expect, it } from "vitest";

import { REDACTED_VALUE } from "../constants/analytics.constants";
import { redactPersonalText, scrubPersonalData } from "./scrubPersonalData";

const captureResultWith = (overrides: Partial<CaptureResult>): CaptureResult => ({
  uuid: "event-1",
  event: "$pageview",
  properties: {},
  ...overrides,
});

describe("redactPersonalText", () => {
  it("hides an email address", () => {
    expect(redactPersonalText("write to sita@example.com today")).toBe(
      `write to ${REDACTED_VALUE} today`,
    );
  });

  it("hides a Nepali mobile number with or without the country code", () => {
    expect(redactPersonalText("call 9812345678")).toBe(`call ${REDACTED_VALUE}`);
    expect(redactPersonalText("call +977-9812345678")).toBe(`call ${REDACTED_VALUE}`);
  });

  it("leaves ids, prices and ordinary text alone", () => {
    const harmlessText = "order 3f9a2c1e-9812-4a7b-8c3d-1234567890ab costs Rs 9812";
    expect(redactPersonalText(harmlessText)).toBe(harmlessText);
  });
});

describe("redactPersonalText with secrets in links", () => {
  it.each([
    ["password reset", "https://outfiqe.com/reset-password?token=abc123"],
    ["email verification", "https://outfiqe.com/verify-email?token=abc123"],
    ["brand invite", "https://outfiqe.com/register/brand?token=abc123"],
    ["rider invite", "https://outfiqe.com/register/rider?token=abc123"],
    ["support reopen", "https://outfiqe.com/support/reopen?token=abc123"],
  ])("hides the token in a %s link", (_linkName, link) => {
    const redacted = redactPersonalText(link);

    expect(redacted).not.toContain("abc123");
    expect(redacted).toContain(`token=${REDACTED_VALUE}`);
  });

  it("hides gateway and sign-in values, keeping the other parameters", () => {
    expect(redactPersonalText("/payments/esewa/callback/1?data=eyJ0&category=dresses")).toBe(
      `/payments/esewa/callback/1?data=${REDACTED_VALUE}&category=dresses`,
    );
    expect(redactPersonalText("/auth/callback?state=s3&code=c0de")).toBe(
      `/auth/callback?state=${REDACTED_VALUE}&code=${REDACTED_VALUE}`,
    );
  });

  it("hides a token inside an encoded redirect link", () => {
    const redacted = redactPersonalText(
      "/login?redirect=%2Freset-password%3Ftoken%3Dabc123%26from%3Demail",
    );

    expect(redacted).not.toContain("abc123");
    expect(redacted).toContain("%26from%3Demail");
  });

  it("leaves ordinary links alone", () => {
    const ordinaryLink = "https://outfiqe.com/search?q=token+ring&category=dresses&page=2";

    expect(redactPersonalText(ordinaryLink)).toBe(ordinaryLink);
  });
});

describe("scrubPersonalData", () => {
  it("hides tokens in every place PostHog keeps a link, including recordings", () => {
    const resetLink = "https://outfiqe.com/reset-password?token=abc123";

    const scrubbed = scrubPersonalData(
      captureResultWith({
        event: "$snapshot",
        properties: {
          $current_url: resetLink,
          $referrer: resetLink,
          $snapshot_data: [{ type: 4, data: { href: resetLink } }],
        },
        $set_once: { $initial_person_info: { u: resetLink } },
      }),
    );

    expect(JSON.stringify(scrubbed)).not.toContain("abc123");
  });

  it("redacts personal data in nested properties and person properties", () => {
    const scrubbed = scrubPersonalData(
      captureResultWith({
        properties: {
          $current_url: "https://outfiqe.com/reset?email=sita@example.com",
          $elements: [{ $el_text: "Call 9812345678" }],
          product_price_npr: 2500,
        },
        $set: { contact: "sita@example.com" },
        $set_once: { first_contact: "9812345678" },
      }),
    );

    expect(scrubbed.properties.$current_url).toBe(
      `https://outfiqe.com/reset?email=${REDACTED_VALUE}`,
    );
    expect(scrubbed.properties.$elements).toEqual([{ $el_text: `Call ${REDACTED_VALUE}` }]);
    expect(scrubbed.properties.product_price_npr).toBe(2500);
    expect(scrubbed.$set).toEqual({ contact: REDACTED_VALUE });
    expect(scrubbed.$set_once).toEqual({ first_contact: REDACTED_VALUE });
  });

  it("doesn't add person properties that weren't there", () => {
    const scrubbed = scrubPersonalData(captureResultWith({ properties: { plan: "free" } }));

    expect(scrubbed).not.toHaveProperty("$set");
    expect(scrubbed).not.toHaveProperty("$set_once");
  });
});
