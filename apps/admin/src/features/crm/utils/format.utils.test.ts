import { describe, expect, it } from "vitest";

import { formatDuration, formatRupees } from "./format.utils";

describe("formatRupees", () => {
  it("prefixes an amount with the currency and groups thousands", () => {
    expect(formatRupees(4500)).toBe("Rs. 4,500");
    expect(formatRupees(0)).toBe("Rs. 0");
  });
});

describe("formatDuration", () => {
  it("returns a dash for a missing, negative, or non-finite value", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(-10)).toBe("—");
    expect(formatDuration(Number.NaN)).toBe("—");
  });

  it("collapses anything under a minute", () => {
    expect(formatDuration(0)).toBe("<1m");
    expect(formatDuration(45)).toBe("<1m");
  });

  it("formats minutes, hours, and days with a rounded remainder", () => {
    expect(formatDuration(15 * 60)).toBe("15m");
    expect(formatDuration(2 * 3600)).toBe("2h");
    expect(formatDuration(2 * 3600 + 15 * 60)).toBe("2h 15m");
    expect(formatDuration(24 * 3600)).toBe("1d");
    expect(formatDuration(3 * 24 * 3600 + 4 * 3600)).toBe("3d 4h");
  });
});
