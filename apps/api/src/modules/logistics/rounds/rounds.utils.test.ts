import { addMinutes } from "date-fns/addMinutes";
import { subHours } from "date-fns/subHours";
import { subMinutes } from "date-fns/subMinutes";
import { describe, expect, it } from "vitest";

import {
  resolveScanOccurredAt,
  RIDER_SCAN_MAX_AGE_HOURS,
  SCAN_TIME_VERDICT,
} from "./rounds.utils.js";

const NOW = new Date("2026-10-16T08:00:00.000Z");
const FEW_MINUTES = 5;
const ONE_HOUR = 1;

describe("resolveScanOccurredAt", () => {
  it("keeps the phone's time for a normal scan", () => {
    const deviceScannedAt = subMinutes(NOW, FEW_MINUTES);

    expect(
      resolveScanOccurredAt({ deviceScannedAt, pickupStatusChangedAt: null, now: NOW }),
    ).toEqual({ verdict: SCAN_TIME_VERDICT.ACCEPTED, occurredAt: deviceScannedAt });
  });

  it("never records a scan in the future", () => {
    expect(
      resolveScanOccurredAt({
        deviceScannedAt: addMinutes(NOW, FEW_MINUTES),
        pickupStatusChangedAt: null,
        now: NOW,
      }),
    ).toEqual({ verdict: SCAN_TIME_VERDICT.ACCEPTED, occurredAt: NOW });
  });

  it("moves a scan from a slow phone clock to after the brand marked it ready", () => {
    const readyAt = subMinutes(NOW, FEW_MINUTES);

    expect(
      resolveScanOccurredAt({
        deviceScannedAt: subHours(NOW, ONE_HOUR),
        pickupStatusChangedAt: readyAt,
        now: NOW,
      }),
    ).toEqual({ verdict: SCAN_TIME_VERDICT.ACCEPTED, occurredAt: readyAt });
  });

  it("refuses a scan older than the offline limit", () => {
    expect(
      resolveScanOccurredAt({
        deviceScannedAt: subHours(NOW, RIDER_SCAN_MAX_AGE_HOURS + ONE_HOUR),
        pickupStatusChangedAt: null,
        now: NOW,
      }),
    ).toEqual({ verdict: SCAN_TIME_VERDICT.TOO_OLD });
  });
});
