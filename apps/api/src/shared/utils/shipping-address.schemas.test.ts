import { describe, expect, it } from "vitest";

import { shippingAddressSchema } from "./shipping-address.schemas.js";

const validAddress = {
  fullName: "Test Buyer",
  phone: "9820000000",
  address: "123 Test Street",
  city: "Kathmandu",
};

describe("shippingAddressSchema phone", () => {
  it("keeps a valid mobile number as typed digits", () => {
    expect(shippingAddressSchema.parse(validAddress).phone).toBe("9820000000");
  });

  it("strips spaces and dashes before checking", () => {
    expect(shippingAddressSchema.parse({ ...validAddress, phone: " 98 2000-0000 " }).phone).toBe(
      "9820000000",
    );
  });

  it("rejects a nine digit number and country-code forms riders cannot dial", () => {
    expect(
      shippingAddressSchema.safeParse({ ...validAddress, phone: "+977982000000" }).success,
    ).toBe(false);
    expect(shippingAddressSchema.safeParse({ ...validAddress, phone: "982000000" }).success).toBe(
      false,
    );
  });
});
