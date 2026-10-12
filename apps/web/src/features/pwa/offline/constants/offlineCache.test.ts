import { describe, expect, it } from "vitest";

import { isPersistableQueryKey } from "./offlineCache";

describe("isPersistableQueryKey", () => {
  it.each([
    ["products"],
    ["categories"],
    ["explore-feed"],
    ["creator-looks", "detail", "look-1"],
    ["brand-products"],
    ["creator-leaderboard"],
  ])("saves public catalog data for offline reading: %s", (...queryKey) => {
    expect(isPersistableQueryKey(queryKey)).toBe(true);
  });

  it.each([
    ["bank-accounts", "creator"],
    ["commissions", "mine", "summary"],
    ["brand-payouts", "mine", "summary"],
    ["creator-overview", "mine"],
    ["brand-overview", "mine"],
    ["saved-posts"],
    ["xp", "multiplier", "active"],
    ["notifications"],
    ["conversations"],
    ["cart"],
    ["orders"],
    ["wishlist"],
  ])("never writes personal data to disk: %s", (...queryKey) => {
    expect(isPersistableQueryKey(queryKey)).toBe(false);
  });

  it("refuses anything not explicitly allowed, so a new query is private by default", () => {
    expect(isPersistableQueryKey(["something-added-next-year"])).toBe(false);
  });

  it("ignores a key that does not start with a name", () => {
    expect(isPersistableQueryKey([])).toBe(false);
    expect(isPersistableQueryKey([{ scope: "products" }])).toBe(false);
  });
});
