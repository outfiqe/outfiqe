import { subDays } from "date-fns/subDays";
import { describe, expect, it } from "vitest";

import { BRAND_RELIABILITY_LEVEL, NEW_BRAND_GRACE } from "./reliability.constants.js";
import {
  calculateIncidentRatePercent,
  describeReliabilityLevel,
  isWithinNewBrandGrace,
} from "./reliability.utils.js";

const ESTABLISHED = { isNewToPickup: false };
const NOW = new Date("2026-10-18T06:00:00.000Z");
const ONE_DAY = 1;
const ONE_PICKUP = 1;

describe("describeReliabilityLevel", () => {
  it("stays good below five problems, however few pickups the brand had", () => {
    expect(describeReliabilityLevel({ incidentCount: 4, pickupCount: 4, ...ESTABLISHED })).toBe(
      BRAND_RELIABILITY_LEVEL.GOOD,
    );
  });

  it("warns at five problems only when they are more than one in ten pickups", () => {
    expect(describeReliabilityLevel({ incidentCount: 5, pickupCount: 30, ...ESTABLISHED })).toBe(
      BRAND_RELIABILITY_LEVEL.WARNING,
    );
    expect(describeReliabilityLevel({ incidentCount: 5, pickupCount: 50, ...ESTABLISHED })).toBe(
      BRAND_RELIABILITY_LEVEL.GOOD,
    );
    expect(describeReliabilityLevel({ incidentCount: 5, pickupCount: 300, ...ESTABLISHED })).toBe(
      BRAND_RELIABILITY_LEVEL.GOOD,
    );
  });

  it("asks for a review at ten problems that are more than one in five pickups", () => {
    expect(describeReliabilityLevel({ incidentCount: 10, pickupCount: 40, ...ESTABLISHED })).toBe(
      BRAND_RELIABILITY_LEVEL.REVIEW,
    );
    expect(describeReliabilityLevel({ incidentCount: 10, pickupCount: 50, ...ESTABLISHED })).toBe(
      BRAND_RELIABILITY_LEVEL.WARNING,
    );
  });

  it("treats problems with no pickups in the window as a full rate", () => {
    expect(describeReliabilityLevel({ incidentCount: 5, pickupCount: 0, ...ESTABLISHED })).toBe(
      BRAND_RELIABILITY_LEVEL.WARNING,
    );
  });

  it("never warns a brand that is still new to Outfiqe pickup", () => {
    expect(
      describeReliabilityLevel({ incidentCount: 12, pickupCount: 12, isNewToPickup: true }),
    ).toBe(BRAND_RELIABILITY_LEVEL.GOOD);
  });
});

describe("calculateIncidentRatePercent", () => {
  it("rounds the share of pickups that had a problem", () => {
    expect(calculateIncidentRatePercent(1, 3)).toBe(33);
    expect(calculateIncidentRatePercent(0, 0)).toBe(0);
    expect(calculateIncidentRatePercent(2, 0)).toBe(100);
  });
});

describe("isWithinNewBrandGrace", () => {
  const settledFirstPickupAt = subDays(NOW, NEW_BRAND_GRACE.days + ONE_DAY);

  it("covers a brand with no hub pickups yet", () => {
    expect(isWithinNewBrandGrace({ firstPickupAt: null, totalPickupCount: 0 }, NOW)).toBe(true);
  });

  it("covers the first 30 days, however many pickups there were", () => {
    expect(
      isWithinNewBrandGrace(
        { firstPickupAt: subDays(NOW, NEW_BRAND_GRACE.days - ONE_DAY), totalPickupCount: 200 },
        NOW,
      ),
    ).toBe(true);
  });

  it("covers the first 20 pickups, however long they took", () => {
    expect(
      isWithinNewBrandGrace(
        {
          firstPickupAt: settledFirstPickupAt,
          totalPickupCount: NEW_BRAND_GRACE.pickups - ONE_PICKUP,
        },
        NOW,
      ),
    ).toBe(true);
  });

  it("ends once the brand has had 30 days and 20 pickups", () => {
    expect(
      isWithinNewBrandGrace(
        { firstPickupAt: settledFirstPickupAt, totalPickupCount: NEW_BRAND_GRACE.pickups },
        NOW,
      ),
    ).toBe(false);
  });
});
