import { describe, expect, it } from "vitest";

import { describeShipmentStatus, isDeliveredByOutfiqe } from "./shipmentStatus";

describe("describeShipmentStatus", () => {
  it("uses the brand's own shipping status when the brand ships", () => {
    expect(
      describeShipmentStatus({
        status: "SHIPPED",
        fulfilmentMode: "BRAND_SHIPS",
        pickupStatus: null,
      }),
    ).toEqual({ label: "Shipped", tone: "progress" });
  });

  it("uses the pickup stage while Outfiqe is collecting the items", () => {
    expect(
      describeShipmentStatus({
        status: "PACKED",
        fulfilmentMode: "OUTFIQE_LOGISTICS",
        pickupStatus: "AT_HUB",
      }),
    ).toEqual({ label: "At Outfiqe hub", tone: "progress" });
  });

  it("follows the parcel once the items are packed into it", () => {
    expect(
      describeShipmentStatus({
        status: "DELIVERED",
        fulfilmentMode: "OUTFIQE_LOGISTICS",
        pickupStatus: "IN_PARCEL",
      }),
    ).toEqual({ label: "Delivered", tone: "positive" });
  });
});

describe("isDeliveredByOutfiqe", () => {
  it("is true only for the Outfiqe delivery flow", () => {
    expect(isDeliveredByOutfiqe({ fulfilmentMode: "OUTFIQE_LOGISTICS" })).toBe(true);
    expect(isDeliveredByOutfiqe({ fulfilmentMode: "BRAND_SHIPS" })).toBe(false);
  });
});
