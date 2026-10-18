import { describe, expect, it } from "vitest";

import { formatDeliveryWindow } from "./formatDeliveryWindow";

describe("formatDeliveryWindow", () => {
  it("shows a range of two calendar days", () => {
    expect(formatDeliveryWindow({ earliestDate: "2026-10-16", latestDate: "2026-10-18" })).toBe(
      "Fri, Oct 16 – Sun, Oct 18",
    );
  });

  it("shows a single day when both ends match", () => {
    expect(formatDeliveryWindow({ earliestDate: "2026-10-16", latestDate: "2026-10-16" })).toBe(
      "Fri, Oct 16",
    );
  });
});
