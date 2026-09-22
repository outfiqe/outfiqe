import { describe, expect, it } from "vitest";

import type { TourProgress } from "../api/toursSchemas";
import { TOUR_OUTCOME } from "../constants/tourOutcome";
import { hasSeenTour } from "./hasSeenTour";

const buildProgress = (overrides: Partial<TourProgress> = {}): TourProgress => ({
  tourKey: "crm-dashboard",
  version: 1,
  outcome: TOUR_OUTCOME.COMPLETED,
  updatedAt: "2026-09-21T00:00:00.000Z",
  ...overrides,
});

describe("hasSeenTour", () => {
  it("is false when nothing has been recorded", () => {
    expect(hasSeenTour([], "crm-dashboard", 1)).toBe(false);
  });

  it("is true when the same version was finished", () => {
    expect(hasSeenTour([buildProgress()], "crm-dashboard", 1)).toBe(true);
  });

  it("is true when the same version was skipped", () => {
    const skipped = buildProgress({ outcome: TOUR_OUTCOME.DISMISSED });

    expect(hasSeenTour([skipped], "crm-dashboard", 1)).toBe(true);
  });

  it("is false when only an older version was seen", () => {
    expect(hasSeenTour([buildProgress({ version: 1 })], "crm-dashboard", 2)).toBe(false);
  });

  it("is true when a newer version than the current one was seen", () => {
    expect(hasSeenTour([buildProgress({ version: 3 })], "crm-dashboard", 2)).toBe(true);
  });

  it("ignores progress recorded for a different tour", () => {
    expect(hasSeenTour([buildProgress({ tourKey: "brand-dashboard" })], "crm-dashboard", 1)).toBe(
      false,
    );
  });
});
