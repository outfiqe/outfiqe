import { describe, expect, it } from "vitest";

import { toTrialLabel } from "./trial.utils";

const TODAY = new Date("2026-11-01T00:00:00.000Z");

describe("toTrialLabel", () => {
  it("says a trial is still running", () => {
    expect(toTrialLabel("2026-12-01T00:00:00.000Z", TODAY)).toContain("trial ends");
  });

  it("says when a trial has already ended", () => {
    expect(toTrialLabel("2026-09-24T00:00:00.000Z", TODAY)).toContain("trial ended");
  });
});
