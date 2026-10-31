import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatDate,
  formatDateTime,
  formatShortDate,
  isPastDateInputValue,
  isPastDateTimeInputValue,
  toDateInputValue,
  toDateTimeInputValue,
  toDayEndIso,
  toDayStartIso,
} from "./index";

const MOMENT = "2026-10-31T09:30:00.000Z";

describe("date box values", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 31, 13, 45));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the local day and minute", () => {
    expect(toDateInputValue()).toBe("2026-10-31");
    expect(toDateTimeInputValue()).toBe("2026-10-31T13:45");
  });

  it("covers the whole picked day", () => {
    expect(toDayStartIso("2026-10-31")).toBe(new Date(2026, 9, 31, 0, 0, 0, 0).toISOString());
    expect(toDayEndIso("2026-10-31")).toBe(new Date(2026, 9, 31, 23, 59, 59, 999).toISOString());
  });

  it("treats today as not past, and an empty box as not past", () => {
    expect(isPastDateInputValue("2026-10-30")).toBe(true);
    expect(isPastDateInputValue("2026-10-31")).toBe(false);
    expect(isPastDateInputValue("")).toBe(false);
  });

  it("compares a date and time down to the minute", () => {
    expect(isPastDateTimeInputValue("2026-10-31T13:44")).toBe(true);
    expect(isPastDateTimeInputValue("2026-10-31T13:45")).toBe(false);
    expect(isPastDateTimeInputValue("")).toBe(false);
  });
});

describe("date labels", () => {
  it("shows the same words as the browser's medium style", () => {
    const moment = new Date(MOMENT);

    expect(formatDate(MOMENT)).toBe(
      new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(moment),
    );
    expect(formatDateTime(moment)).toBe(
      new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
        moment,
      ),
    );
    expect(formatShortDate(MOMENT)).toBe(
      new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(moment),
    );
  });

  it.each([null, undefined, "", "not a date"])("shows a dash for %s", (missingDate) => {
    expect(formatDate(missingDate)).toBe("—");
    expect(formatDateTime(missingDate)).toBe("—");
    expect(formatShortDate(missingDate)).toBe("—");
  });
});
