import { describe, expect, it } from "vitest";

import {
  hasRequiredStatusSheetColumns,
  mapStatusSheetHeader,
  parsePartnerSheetTime,
  parseStatusSheetRow,
} from "./partner-status-import.utils.js";

const KATHMANDU = "Asia/Kathmandu";
const NOW = new Date("2026-10-16T12:00:00.000Z");

describe("mapStatusSheetHeader", () => {
  it("recognises the usual column names whatever their case or spacing", () => {
    const columns = mapStatusSheetHeader([
      "Partner ID",
      "Tracking code",
      "Status",
      "Date",
      "Remarks",
    ]);

    expect(columns).toEqual({
      partnerReference: 0,
      merchantReference: 1,
      rawStatus: 2,
      occurredAt: 3,
      rawReason: 4,
    });
    expect(hasRequiredStatusSheetColumns(columns)).toBe(true);
  });

  it("needs a status, a time and at least one reference", () => {
    expect(hasRequiredStatusSheetColumns(mapStatusSheetHeader(["status", "time"]))).toBe(false);
    expect(hasRequiredStatusSheetColumns(mapStatusSheetHeader(["partner_id", "status"]))).toBe(
      false,
    );
  });
});

describe("parsePartnerSheetTime", () => {
  it("reads a time without a zone in the hub's time zone", () => {
    expect(parsePartnerSheetTime("2026-10-16 14:30", KATHMANDU)?.toISOString()).toBe(
      "2026-10-16T08:45:00.000Z",
    );
  });

  it("keeps a time that already has a zone", () => {
    expect(parsePartnerSheetTime("2026-10-16T08:45:00Z", KATHMANDU)?.toISOString()).toBe(
      "2026-10-16T08:45:00.000Z",
    );
  });

  it("rejects unreadable and impossible times", () => {
    expect(parsePartnerSheetTime("yesterday", KATHMANDU)).toBeNull();
    expect(parsePartnerSheetTime("2026-13-40 10:00", KATHMANDU)).toBeNull();
  });
});

describe("parseStatusSheetRow", () => {
  const columns = mapStatusSheetHeader(["partnerReference", "status", "time", "reason", "cod"]);

  it("turns a row into a partner update", () => {
    const parsed = parseStatusSheetRow(
      ["PX-55821", "Delivered", "2026-10-16 14:30", "", "2400"],
      columns,
      { timeZone: KATHMANDU, now: NOW },
    );

    expect(parsed).toMatchObject({
      isValid: true,
      event: {
        partnerReference: "PX-55821",
        merchantReference: null,
        rawStatus: "Delivered",
        rawReason: null,
        codCollectedAmount: 2400,
        partnerEventId: null,
      },
    });
  });

  it("explains what is wrong with a bad row", () => {
    const options = { timeZone: KATHMANDU, now: NOW };

    expect(
      parseStatusSheetRow(["", "Delivered", "2026-10-16 14:30", "", ""], columns, options),
    ).toEqual({
      isValid: false,
      message: "The row needs the partner's ID or our parcel code.",
    });
    expect(
      parseStatusSheetRow(["PX-1", "Delivered", "2026-10-17 18:00", "", ""], columns, options),
    ).toEqual({
      isValid: false,
      message: "The time is in the future.",
    });
    expect(
      parseStatusSheetRow(["PX-1", "Delivered", "2026-10-16 14:30", "", "-5"], columns, options),
    ).toEqual({
      isValid: false,
      message: "The cash collected must be a whole amount.",
    });
  });
});
