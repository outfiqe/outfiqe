import { describe, expect, it } from "vitest";

import { listOfferPaymentMethods } from "./listOfferPaymentMethods";

describe("listOfferPaymentMethods", () => {
  it("leaves Khalti out while its switch is off", () => {
    expect(listOfferPaymentMethods(false)).toEqual(["ESEWA"]);
  });

  it("offers Khalti once its switch is on", () => {
    expect(listOfferPaymentMethods(true)).toEqual(["ESEWA", "KHALTI"]);
  });
});
