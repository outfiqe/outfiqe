import { describe, expect, it } from "vitest";

import { toDaysInStageLabel } from "./dealCard.utils";

const NOW = new Date("2026-11-10T12:00:00.000Z");

describe("toDaysInStageLabel", () => {
  it("says a deal is new on its first day", () => {
    expect(
      toDaysInStageLabel({ status: "OPEN", stageEnteredAt: "2026-11-10T06:00:00.000Z" }, NOW),
    ).toBe("New in this stage");
  });

  it("uses the singular for one day", () => {
    expect(
      toDaysInStageLabel({ status: "OPEN", stageEnteredAt: "2026-11-09T06:00:00.000Z" }, NOW),
    ).toBe("1 day in this stage");
  });

  it("counts whole days", () => {
    expect(
      toDaysInStageLabel({ status: "OPEN", stageEnteredAt: "2026-11-01T06:00:00.000Z" }, NOW),
    ).toBe("9 days in this stage");
  });

  it("shows nothing once the deal is closed", () => {
    expect(
      toDaysInStageLabel({ status: "WON", stageEnteredAt: "2026-11-01T06:00:00.000Z" }, NOW),
    ).toBeNull();
  });
});
