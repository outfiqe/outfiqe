import { describe, expect, it } from "vitest";

import { hubBodySchema, setHubPickupZonesSchema } from "./hub.schemas.js";

const validHub = {
  name: "Kathmandu Hub",
  countryCode: "np",
  address: "Teku Road",
  city: "Kathmandu",
  phone: "9812345678",
  timeZone: "Asia/Kathmandu",
  workingDays: [0, 1, 2, 3, 4, 5],
  openTime: "09:00",
  closeTime: "19:00",
  pickupRoundTimes: ["11:00", "15:00"],
  readyCutoffMinutes: 60,
  partnerCollectionTime: "17:30",
};

const issuePathsFor = (candidate: unknown) => {
  const result = hubBodySchema.safeParse(candidate);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
};

describe("hubBodySchema", () => {
  it("accepts a valid hub and upper-cases the country", () => {
    const parsed = hubBodySchema.parse(validHub);

    expect(parsed.countryCode).toBe("NP");
    expect(parsed.isActive).toBe(true);
  });

  it("rejects a time that isn't 24-hour HH:mm", () => {
    expect(issuePathsFor({ ...validHub, openTime: "9am" })).toContain("openTime");
  });

  it("rejects a hub that closes before it opens", () => {
    expect(issuePathsFor({ ...validHub, openTime: "19:00", closeTime: "09:00" })).toContain(
      "closeTime",
    );
  });

  it("rejects a pickup round outside opening hours", () => {
    expect(issuePathsFor({ ...validHub, pickupRoundTimes: ["08:00"] })).toContain(
      "pickupRoundTimes",
    );
  });

  it("rejects partner collection outside opening hours", () => {
    expect(issuePathsFor({ ...validHub, partnerCollectionTime: "20:00" })).toContain(
      "partnerCollectionTime",
    );
  });

  it("rejects a repeated working day", () => {
    expect(issuePathsFor({ ...validHub, workingDays: [1, 1] })).toContain("workingDays");
  });

  it("rejects an unknown time zone", () => {
    expect(issuePathsFor({ ...validHub, timeZone: "Mars/Olympus" })).toContain("timeZone");
  });
});

describe("setHubPickupZonesSchema", () => {
  it("rejects the same zone listed twice", () => {
    const zoneId = "11111111-1111-4111-8111-111111111111";

    expect(setHubPickupZonesSchema.safeParse({ deliveryZoneIds: [zoneId, zoneId] }).success).toBe(
      false,
    );
  });
});
