import { describe, expect, it } from "vitest";

import { buildAdminOrderSearchFilter, MATCHES_NO_ORDER } from "./order-admin-search.utils.js";

const FULL_ORDER_ID = "28a55bf3-1111-4222-8333-444455556666";

describe("buildAdminOrderSearchFilter", () => {
  it("turns a short reference with a hash into a primary-key range", () => {
    expect(buildAdminOrderSearchFilter("#28A55BF3")).toEqual({
      id: {
        gte: "28a55bf3-0000-0000-0000-000000000000",
        lte: "28a55bf3-ffff-ffff-ffff-ffffffffffff",
      },
    });
  });

  it("treats a short reference without a hash the same way", () => {
    expect(buildAdminOrderSearchFilter("28a55bf3")).toEqual(
      buildAdminOrderSearchFilter("#28A55BF3"),
    );
  });

  it("matches a full order id exactly", () => {
    expect(buildAdminOrderSearchFilter(FULL_ORDER_ID.toUpperCase())).toEqual({
      id: FULL_ORDER_ID,
    });
  });

  it("matches a buyer email on the unique email column", () => {
    expect(buildAdminOrderSearchFilter("  Buyer@Example.com ")).toEqual({
      user: { email: { in: ["Buyer@Example.com", "buyer@example.com"] } },
    });
  });

  it.each(["9812345678", "+977 9812345678", "977-9812345678"])(
    "matches a buyer phone typed as %s on the unique phone column",
    (typedPhone) => {
      expect(buildAdminOrderSearchFilter(typedPhone)).toEqual({ user: { phone: "9812345678" } });
    },
  );

  it.each(["Long coat", "zz", "12"])("matches nothing for %s", (unsearchableTerm) => {
    expect(buildAdminOrderSearchFilter(unsearchableTerm)).toEqual(MATCHES_NO_ORDER);
  });
});
