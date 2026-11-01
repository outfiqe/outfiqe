import { describe, expect, it } from "vitest";

import { toDayRange, toTaskDueRange } from "./taskDue.utils";

const NOW = new Date(2026, 10, 10, 14, 30);

describe("toTaskDueRange", () => {
  it("treats anything due before now as overdue", () => {
    expect(toTaskDueRange("overdue", NOW)).toEqual({ dueTo: NOW.toISOString() });
  });

  it("covers the whole local day for today", () => {
    expect(toTaskDueRange("today", NOW)).toEqual({
      dueFrom: new Date(2026, 10, 10, 0, 0, 0, 0).toISOString(),
      dueTo: new Date(2026, 10, 10, 23, 59, 59, 999).toISOString(),
    });
  });

  it("starts upcoming at the next local day", () => {
    expect(toTaskDueRange("upcoming", NOW)).toEqual({
      dueFrom: new Date(2026, 10, 11, 0, 0, 0, 0).toISOString(),
    });
  });

  it("rolls over the end of a month", () => {
    expect(toTaskDueRange("upcoming", new Date(2026, 10, 30, 9, 0))).toEqual({
      dueFrom: new Date(2026, 11, 1, 0, 0, 0, 0).toISOString(),
    });
  });
});

describe("toDayRange", () => {
  it("returns nothing for an empty date", () => {
    expect(toDayRange("", "start")).toBeUndefined();
  });

  it("covers the local day from start to end", () => {
    expect(toDayRange("2026-11-10", "start")).toBe(new Date(2026, 10, 10).toISOString());
    expect(toDayRange("2026-11-10", "end")).toBe(
      new Date(2026, 10, 10, 23, 59, 59, 999).toISOString(),
    );
  });
});
