import { describe, expect, it } from "vitest";

import { listCheckoutPaymentMethods } from "./listCheckoutPaymentMethods";

const listValues = (isKhaltiOn: boolean) =>
  listCheckoutPaymentMethods(isKhaltiOn).map(({ value }) => value);

describe("listCheckoutPaymentMethods", () => {
  it("leaves Khalti out while its switch is off", () => {
    expect(listValues(false)).toEqual(["COD", "ESEWA"]);
  });

  it("offers Khalti once its switch is on", () => {
    expect(listValues(true)).toEqual(["COD", "ESEWA", "KHALTI"]);
  });
});
