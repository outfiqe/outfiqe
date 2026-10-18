import { describe, expect, it } from "vitest";

import type { RiderTaskStop } from "../api/riderSchemas";
import {
  buildMapsLink,
  countCollectedStops,
  describeItemCount,
  describeScanCount,
  formatShortOrderId,
} from "./riderTask.utils";

const pickupLocation = {
  label: "Studio",
  contactName: "Mina",
  contactPhoneE164: "+9779812345678",
  address: "Jhamsikhel Road",
  landmark: null,
  city: "Lalitpur",
  latitude: null,
  longitude: null,
  openingNote: null,
};

describe("riderTask utils", () => {
  it("shortens an order id for the rider", () => {
    expect(formatShortOrderId("6f1d2c1e-4b8a")).toBe("#6F1D2C1E");
  });

  it("counts collected bags", () => {
    const stop: RiderTaskStop = {
      id: "s",
      direction: "COLLECT",
      brandReturn: null,
      fulfilmentGroupId: "g",
      orderId: "o",
      itemCount: 1,
      isCollected: false,
      bagTagCode: null,
    };
    expect(
      countCollectedStops({
        stops: [
          { ...stop, isCollected: true },
          { ...stop, isCollected: false },
        ],
      }),
    ).toBe(1);
  });

  it("uses the map pin when there is one, otherwise the address", () => {
    expect(buildMapsLink({ ...pickupLocation, latitude: 27.68, longitude: 85.31 })).toContain(
      encodeURIComponent("27.68,85.31"),
    );
    expect(buildMapsLink(pickupLocation)).toContain(
      encodeURIComponent("Jhamsikhel Road, Lalitpur"),
    );
  });

  it("words counts naturally", () => {
    expect(describeScanCount(1)).toBe("1 scan");
    expect(describeScanCount(3)).toBe("3 scans");
    expect(describeItemCount(1)).toBe("1 item");
    expect(describeItemCount(2)).toBe("2 items");
  });
});
