import { describe, expect, it } from "vitest";

import type { Hub } from "../api/hubsSchemas";
import {
  EMPTY_HUB_FORM,
  formatWorkingDays,
  parseRoundTimes,
  toHubFormValues,
  toHubRequestBody,
} from "./hubForm.utils";

const hub: Hub = {
  id: "hub-1",
  name: "Kathmandu Hub",
  countryCode: "NP",
  address: "Teku Road",
  city: "Kathmandu",
  phone: "+9779812345678",
  timeZone: "Asia/Kathmandu",
  workingDays: [0, 1, 2, 3, 4, 5],
  openTime: "09:00",
  closeTime: "19:00",
  pickupRoundTimes: ["11:00", "15:00"],
  readyCutoffMinutes: 60,
  partnerCollectionTime: "17:30",
  isActive: true,
  pickupZones: [],
};

describe("parseRoundTimes", () => {
  it("reads comma-separated times in order", () => {
    expect(parseRoundTimes("15:00, 11:00")).toEqual(["11:00", "15:00"]);
  });

  it("rejects a time that isn't HH:mm", () => {
    expect(parseRoundTimes("11am")).toBeNull();
  });

  it("rejects a repeated time", () => {
    expect(parseRoundTimes("11:00, 11:00")).toBeNull();
  });

  it("rejects an empty list", () => {
    expect(parseRoundTimes(" , ")).toBeNull();
  });
});

describe("hub form conversion", () => {
  it("round-trips a hub through the form", () => {
    expect(toHubRequestBody(toHubFormValues(hub))).toEqual({
      name: hub.name,
      countryCode: "NP",
      address: hub.address,
      city: hub.city,
      phone: hub.phone,
      timeZone: hub.timeZone,
      workingDays: hub.workingDays,
      openTime: hub.openTime,
      closeTime: hub.closeTime,
      pickupRoundTimes: hub.pickupRoundTimes,
      readyCutoffMinutes: hub.readyCutoffMinutes,
      partnerCollectionTime: hub.partnerCollectionTime,
      isActive: hub.isActive,
    });
  });

  it("starts a new hub on Nepal's working week and time zone", () => {
    expect(EMPTY_HUB_FORM).toMatchObject({
      timeZone: "Asia/Kathmandu",
      workingDays: [0, 1, 2, 3, 4, 5],
    });
  });
});

describe("formatWorkingDays", () => {
  it("lists the working days by short name in week order", () => {
    expect(formatWorkingDays([5, 0, 1])).toBe("Sun, Mon, Fri");
  });
});
