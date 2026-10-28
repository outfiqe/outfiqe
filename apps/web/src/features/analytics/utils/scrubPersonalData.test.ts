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

describe("scrubPersonalData", () => {
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
