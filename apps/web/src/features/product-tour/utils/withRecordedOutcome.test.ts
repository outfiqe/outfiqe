import { TourOutcome } from "@outfiqe/types";
import { describe, expect, it } from "vitest";

import { withRecordedOutcome } from "./withRecordedOutcome";

const RECORDED_AT = new Date("2026-09-21T10:00:00.000Z");

describe("withRecordedOutcome", () => {
  it("creates the list when nothing was loaded yet", () => {
    const progress = withRecordedOutcome(
      undefined,
      { tourKey: "brand-dashboard", version: 1, outcome: TourOutcome.COMPLETED },
      RECORDED_AT,
    );

    expect(progress).toEqual({
      tours: [
        {
          tourKey: "brand-dashboard",
          version: 1,
          outcome: TourOutcome.COMPLETED,
          updatedAt: "2026-09-21T10:00:00.000Z",
        },
      ],
    });
  });

  it("replaces the earlier entry for the same tour and keeps other tours", () => {
    const progress = withRecordedOutcome(
      {
        tours: [
          {
            tourKey: "brand-dashboard",
            version: 1,
            outcome: TourOutcome.DISMISSED,
            updatedAt: "2026-09-01T00:00:00.000Z",
          },
          {
            tourKey: "creator-dashboard",
            version: 1,
            outcome: TourOutcome.COMPLETED,
            updatedAt: "2026-09-02T00:00:00.000Z",
          },
        ],
      },
      { tourKey: "brand-dashboard", version: 2, outcome: TourOutcome.COMPLETED },
      RECORDED_AT,
    );

    expect(progress.tours).toHaveLength(2);
    expect(progress.tours).toContainEqual(
      expect.objectContaining({ tourKey: "creator-dashboard" }),
    );
    expect(progress.tours).toContainEqual({
      tourKey: "brand-dashboard",
      version: 2,
      outcome: TourOutcome.COMPLETED,
      updatedAt: "2026-09-21T10:00:00.000Z",
    });
  });
});
