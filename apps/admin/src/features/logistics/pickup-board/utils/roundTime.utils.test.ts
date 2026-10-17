import { describe, expect, it } from "vitest";

import { isCompleteDateTimeLocal, roundTimeToday, toDateTimeLocalValue } from "./roundTime.utils";

const TODAY = new Date(2026, 9, 16, 8, 45);

describe("round time utils", () => {
  it("formats a date for a datetime-local input", () => {
    expect(toDateTimeLocalValue(TODAY)).toBe("2026-10-16T08:45");
  });

  it("puts a hub round time on today's date", () => {
    expect(roundTimeToday("15:00", TODAY)).toBe("2026-10-16T15:00");
  });

  it("only accepts a fully filled date and time", () => {
    expect(isCompleteDateTimeLocal("2026-10-16T15:00")).toBe(true);
    expect(isCompleteDateTimeLocal("2026-10-16")).toBe(false);
    expect(isCompleteDateTimeLocal("")).toBe(false);
  });
});
