import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime, formatShortDate } from "./index";

const MOMENT = "2026-10-31T09:30:00.000Z";

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
