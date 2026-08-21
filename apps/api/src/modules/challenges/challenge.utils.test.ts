import { describe, expect, it } from "vitest";

import { computeChallengeStatus } from "./challenge.utils.js";

const now = new Date("2026-08-21T12:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;
const past = new Date(now.getTime() - HOUR_MS);
const future = new Date(now.getTime() + HOUR_MS);

describe("computeChallengeStatus", () => {
  it("is OPEN when now falls inside the window", () => {
    expect(computeChallengeStatus(past, future, now)).toBe("OPEN");
  });

  it("is OPEN when neither boundary is set", () => {
    expect(computeChallengeStatus(null, null, now)).toBe("OPEN");
  });

  it("is UPCOMING when the window hasn't opened yet", () => {
    expect(computeChallengeStatus(future, null, now)).toBe("UPCOMING");
  });

  it("is ENDED when the window has already closed", () => {
    expect(computeChallengeStatus(null, past, now)).toBe("ENDED");
  });

  it("is OPEN exactly at the start boundary", () => {
    expect(computeChallengeStatus(now, future, now)).toBe("OPEN");
  });

  it("is OPEN exactly at the end boundary", () => {
    expect(computeChallengeStatus(past, now, now)).toBe("OPEN");
  });
});
