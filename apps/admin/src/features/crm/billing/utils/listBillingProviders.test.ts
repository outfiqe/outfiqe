import { describe, expect, it } from "vitest";

import { listBillingProviders } from "./listBillingProviders";

describe("listBillingProviders", () => {
  it("leaves Khalti out while its switch is off", () => {
    expect(listBillingProviders(false)).toEqual(["ESEWA"]);
  });

  it("offers Khalti once its switch is on", () => {
    expect(listBillingProviders(true)).toEqual(["ESEWA", "KHALTI"]);
  });
});
