import { describe, expect, it } from "vitest";

import { RiderEarningKind } from "#generated/prisma/enums.js";

import { calculateVisitEarning } from "./rider-pay.utils.js";

const NEPAL_CONTRACTOR_PAY = { visitAmount: 70, extraStopAmount: 15, wastedVisitAmount: 35 };

describe("calculateVisitEarning", () => {
  it("pays the visit rate for the first bag and the extra-stop rate for each one after", () => {
    expect(
      calculateVisitEarning({ kind: RiderEarningKind.VISIT, stopCount: 1 }, NEPAL_CONTRACTOR_PAY),
    ).toBe(70);
    expect(
      calculateVisitEarning({ kind: RiderEarningKind.VISIT, stopCount: 4 }, NEPAL_CONTRACTOR_PAY),
    ).toBe(115);
  });

  it("pays the wasted-visit rate whatever the stop count", () => {
    expect(
      calculateVisitEarning(
        { kind: RiderEarningKind.WASTED_VISIT, stopCount: 3 },
        NEPAL_CONTRACTOR_PAY,
      ),
    ).toBe(35);
  });

  it("never pays less than the visit rate for a visit", () => {
    expect(
      calculateVisitEarning({ kind: RiderEarningKind.VISIT, stopCount: 0 }, NEPAL_CONTRACTOR_PAY),
    ).toBe(70);
  });
});
