import { describe, expect, it } from "vitest";

import { toPlanStatusSentence, toSeatUsage } from "./billingStatus.utils";

const SUBSCRIPTION = {
  status: "ACTIVE",
  currentPeriodEnd: "2026-12-01T00:00:00.000Z",
  cancelAtPeriodEnd: false,
} as const;

describe("toPlanStatusSentence", () => {
  it("says when an active plan renews", () => {
    expect(toPlanStatusSentence(SUBSCRIPTION)).toMatch(/^Your plan renews on/);
  });

  it("says a cancelled plan stays active until the period ends", () => {
    expect(toPlanStatusSentence({ ...SUBSCRIPTION, cancelAtPeriodEnd: true })).toMatch(
      /^Your plan stays active until .*, then it ends\.$/,
    );
  });

  it("asks for payment when the plan is past due", () => {
    expect(toPlanStatusSentence({ ...SUBSCRIPTION, status: "PAST_DUE" })).toMatch(
      /didn't go through/,
    );
  });

  it("says an ended plan has ended", () => {
    expect(toPlanStatusSentence({ ...SUBSCRIPTION, status: "CANCELED" })).toMatch(
      /^This plan ended on/,
    );
  });

  it("gives the trial end date", () => {
    expect(toPlanStatusSentence({ ...SUBSCRIPTION, status: "TRIALING" })).toMatch(
      /^Your trial runs until/,
    );
  });
});

describe("toSeatUsage", () => {
  it("counts seats in plain words", () => {
    expect(toSeatUsage(3, 5)).toBe("3 of 5 seats used");
    expect(toSeatUsage(1, 1)).toBe("1 of 1 seat used");
  });
});
