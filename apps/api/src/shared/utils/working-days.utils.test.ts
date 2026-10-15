import { describe, expect, it } from "vitest";

import { PLATFORM_DEFAULT_COUNTRY_SETTINGS } from "#constants/country.constants.js";

import { addWorkingDaysAsCalendarDate, calendarDateToUtcMidnight } from "./working-days.utils.js";

const nepalCalendar = PLATFORM_DEFAULT_COUNTRY_SETTINGS;

const ONE_WORKING_DAY = 1;
const TWO_WORKING_DAYS = 2;
const NO_WORKING_DAYS = 0;

describe("addWorkingDaysAsCalendarDate", () => {
  it("counts the next working day in the calendar's own time zone", () => {
    const wednesdayEveningInKathmandu = new Date("2026-10-14T13:00:00.000Z");

    expect(
      addWorkingDaysAsCalendarDate(wednesdayEveningInKathmandu, ONE_WORKING_DAY, nepalCalendar),
    ).toBe("2026-10-15");
  });

  it("uses the local date, not the UTC date, near midnight", () => {
    const thursdayJustAfterMidnightInKathmandu = new Date("2026-10-14T18:30:00.000Z");

    expect(
      addWorkingDaysAsCalendarDate(
        thursdayJustAfterMidnightInKathmandu,
        ONE_WORKING_DAY,
        nepalCalendar,
      ),
    ).toBe("2026-10-16");
  });

  it("skips the Saturday day off", () => {
    const fridayInKathmandu = new Date("2026-10-16T06:00:00.000Z");

    expect(addWorkingDaysAsCalendarDate(fridayInKathmandu, ONE_WORKING_DAY, nepalCalendar)).toBe(
      "2026-10-18",
    );
  });

  it("counts several working days across a weekend", () => {
    const fridayInKathmandu = new Date("2026-10-16T06:00:00.000Z");

    expect(addWorkingDaysAsCalendarDate(fridayInKathmandu, TWO_WORKING_DAYS, nepalCalendar)).toBe(
      "2026-10-19",
    );
  });

  it("returns the same local date for zero working days", () => {
    const saturdayInKathmandu = new Date("2026-10-17T06:00:00.000Z");

    expect(addWorkingDaysAsCalendarDate(saturdayInKathmandu, NO_WORKING_DAYS, nepalCalendar)).toBe(
      "2026-10-17",
    );
  });
});

describe("calendarDateToUtcMidnight", () => {
  it("stores a calendar date as midnight UTC so a date column keeps the same day", () => {
    expect(calendarDateToUtcMidnight("2026-10-18").toISOString()).toBe("2026-10-18T00:00:00.000Z");
  });
});
