import { describe, expect, it } from "vitest";

import {
  addHubWorkingDays,
  calendarDateBefore,
  localCalendarDate,
  nextPartnerCollectionAfter,
} from "./alert-deadlines.utils.js";

const KATHMANDU_HUB = {
  timeZone: "Asia/Kathmandu",
  workingDays: [0, 1, 2, 3, 4, 5],
  partnerCollectionTime: "16:00",
};

describe("addHubWorkingDays", () => {
  it("keeps the time of day and skips the hub's day off", () => {
    const fridayMorning = new Date("2026-10-16T04:15:00.000Z");

    expect(addHubWorkingDays(fridayMorning, 1, KATHMANDU_HUB).toISOString()).toBe(
      "2026-10-18T04:15:00.000Z",
    );
  });

  it("counts from a day off as if it were the next working day", () => {
    const saturdayNoon = new Date("2026-10-17T06:15:00.000Z");

    expect(addHubWorkingDays(saturdayNoon, 1, KATHMANDU_HUB).toISOString()).toBe(
      "2026-10-18T06:15:00.000Z",
    );
  });

  it("returns the same moment for no working days", () => {
    const moment = new Date("2026-10-15T04:15:00.000Z");

    expect(addHubWorkingDays(moment, 0, KATHMANDU_HUB)).toEqual(moment);
  });
});

describe("nextPartnerCollectionAfter", () => {
  it("is today's collection when it hasn't happened yet", () => {
    const thursdayMorning = new Date("2026-10-15T04:15:00.000Z");

    expect(nextPartnerCollectionAfter(thursdayMorning, KATHMANDU_HUB)?.toISOString()).toBe(
      "2026-10-15T10:15:00.000Z",
    );
  });

  it("moves to the next working day once today's collection has passed", () => {
    const fridayEvening = new Date("2026-10-16T12:15:00.000Z");

    expect(nextPartnerCollectionAfter(fridayEvening, KATHMANDU_HUB)?.toISOString()).toBe(
      "2026-10-18T10:15:00.000Z",
    );
  });

  it("gives up when the hub has no working days", () => {
    expect(
      nextPartnerCollectionAfter(new Date("2026-10-15T04:15:00.000Z"), {
        ...KATHMANDU_HUB,
        workingDays: [],
      }),
    ).toBeNull();
  });
});

describe("calendar dates", () => {
  it("reads the local date in the hub's time zone", () => {
    expect(localCalendarDate(new Date("2026-10-15T19:00:00.000Z"), "Asia/Kathmandu")).toBe(
      "2026-10-16",
    );
  });

  it("steps back a day, across a month boundary", () => {
    expect(calendarDateBefore("2026-11-01", 1)).toBe("2026-10-31");
  });
});
