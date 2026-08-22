import { describe, expect, it } from "vitest";

import {
  currentIsoWeekKey,
  currentIsoWeekStart,
  isoWeekKey,
  nextIsoWeekStart,
  previousIsoWeekKey,
} from "./iso-week.utils.js";

describe("isoWeekKey", () => {
  it("formats a mid-year date as YYYY-Www", () => {
    expect(isoWeekKey(new Date("2026-08-21T12:00:00.000Z"))).toBe("2026-W34");
  });

  it("pads single-digit ISO weeks to two digits", () => {
    expect(isoWeekKey(new Date("2026-01-05T12:00:00.000Z"))).toBe("2026-W02");
  });

  it("uses the ISO week year, not the calendar year, for a year-boundary date", () => {
    expect(isoWeekKey(new Date("2027-01-01T12:00:00.000Z"))).toBe("2026-W53");
  });
});

describe("currentIsoWeekKey / previousIsoWeekKey", () => {
  it("previousIsoWeekKey is exactly one ISO week behind currentIsoWeekKey", () => {
    const now = new Date("2026-08-21T12:00:00.000Z");
    expect(currentIsoWeekKey(now)).toBe("2026-W34");
    expect(previousIsoWeekKey(now)).toBe("2026-W33");
  });
});

const MONDAY = 1;

describe("currentIsoWeekStart / nextIsoWeekStart", () => {
  it("currentIsoWeekStart returns midnight on the Monday of the given date's ISO week", () => {
    const now = new Date("2026-08-21T12:00:00.000Z");
    const start = currentIsoWeekStart(now);
    expect(start.getDay()).toBe(MONDAY);
    expect([start.getHours(), start.getMinutes(), start.getSeconds()]).toEqual([0, 0, 0]);
    expect(start.getTime()).toBeLessThanOrEqual(now.getTime());
  });

  it("nextIsoWeekStart is exactly one week after currentIsoWeekStart", () => {
    const now = new Date("2026-08-21T12:00:00.000Z");
    const current = currentIsoWeekStart(now);
    const next = nextIsoWeekStart(now);
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    expect(next.getTime() - current.getTime()).toBe(oneWeekMs);
  });
});
