import { describe, expect, it } from "vitest";

import { formatLakhAmount, formatNepalDateTime } from "./outfitFormatting";

describe("formatLakhAmount", () => {
  it("groups rupees the Nepali way, in lakhs", () => {
    expect(formatLakhAmount(240_000)).toBe("2,40,000");
    expect(formatLakhAmount(7_450)).toBe("7,450");
    expect(formatLakhAmount(12_345_678)).toBe("1,23,45,678");
  });

  it("drops paisa, since prices are whole rupees", () => {
    expect(formatLakhAmount(999.6)).toBe("1,000");
  });
});

describe("formatNepalDateTime", () => {
  it("shows the time in Nepal, not the viewer's time zone", () => {
    expect(formatNepalDateTime("2026-09-30T06:15:00.000Z", "en")).toContain("12:00");
  });
});
