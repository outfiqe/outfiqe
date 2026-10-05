import { describe, expect, it } from "vitest";

import {
  AccountStatus,
  CreatorStatus,
  DiscountType,
  OutfitMemberRole,
  UserRole,
} from "#generated/prisma/enums.js";

import {
  canReceiveOffers,
  hasStock,
  parseSnapshotItems,
  parseVersionHeader,
  toETag,
  toItemAvailability,
  toLiveUnitPrice,
  toViewerRole,
} from "./outfit.utils.js";

describe("parseVersionHeader", () => {
  it("reads a plain number, a quoted ETag and a weak ETag", () => {
    expect(parseVersionHeader("3")).toBe(3);
    expect(parseVersionHeader('"12"')).toBe(12);
    expect(parseVersionHeader('W/"7"')).toBe(7);
    expect(parseVersionHeader('  "0"  ')).toBe(0);
  });

  it("refuses anything that isn't a whole version number", () => {
    for (const headerValue of ["latest", "-1", "1.5", '"abc"', "*", ""]) {
      expect(parseVersionHeader(headerValue)).toBeNull();
    }
  });

  it("round-trips with toETag", () => {
    expect(parseVersionHeader(toETag(42))).toBe(42);
  });
});

describe("stock and price", () => {
  it("treats a product as in stock only when a size has units left", () => {
    expect(hasStock([{ stock: 0 }, { stock: 2 }])).toBe(true);
    expect(hasStock([{ stock: 0 }])).toBe(false);
    expect(hasStock([])).toBe(false);
  });

  it("describes availability in words, including low stock", () => {
    expect(toItemAvailability({ sizes: [{ label: "M", stock: 3 }], lowStock: false })).toBe(
      "IN_STOCK",
    );
    expect(toItemAvailability({ sizes: [{ label: "M", stock: 1 }], lowStock: true })).toBe(
      "LOW_STOCK",
    );
    expect(toItemAvailability({ sizes: [{ label: "M", stock: 0 }], lowStock: true })).toBe(
      "OUT_OF_STOCK",
    );
  });

  it("uses the list price, or the active brand discount when there is one", () => {
    expect(toLiveUnitPrice({ price: 2_000, discounts: [] })).toBe(2_000);
    expect(
      toLiveUnitPrice({
        price: 2_000,
        discounts: [
          {
            id: "discount-1",
            productId: "product-1",
            discountType: DiscountType.FIXED,
            percentBasisPoints: null,
            fixedAmount: 500,
            startsAt: new Date(),
            endsAt: null,
            isActive: true,
            createdById: "brand-owner-1",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }),
    ).toBe(1_500);
  });
});

describe("canReceiveOffers", () => {
  const approvedCreator = {
    role: UserRole.CUSTOMER,
    accountStatus: AccountStatus.ACTIVE,
    isCreator: true,
    creatorStatus: CreatorStatus.APPROVED,
  };

  it("lets only an active, approved creator shopper receive offers", () => {
    expect(canReceiveOffers(approvedCreator)).toBe(true);
    expect(canReceiveOffers({ ...approvedCreator, creatorStatus: CreatorStatus.PENDING })).toBe(
      false,
    );
    expect(canReceiveOffers({ ...approvedCreator, isCreator: false })).toBe(false);
    expect(canReceiveOffers({ ...approvedCreator, role: UserRole.BRAND_OWNER })).toBe(false);
    expect(canReceiveOffers({ ...approvedCreator, accountStatus: AccountStatus.SUSPENDED })).toBe(
      false,
    );
  });
});

describe("toViewerRole", () => {
  it("maps member roles and treats everyone else as a viewer", () => {
    expect(toViewerRole(OutfitMemberRole.OWNER)).toBe("OWNER");
    expect(toViewerRole(OutfitMemberRole.EDITOR)).toBe("EDITOR");
    expect(toViewerRole(null)).toBe("VIEWER");
  });
});

describe("parseSnapshotItems", () => {
  it("keeps well-formed items and drops a malformed list", () => {
    const item = {
      slotKey: "top",
      slotLabel: "Top",
      position: 0,
      productId: "product-1",
      productName: "Maroon Kurta",
      imageUrl: null,
      brandName: "Kathmandu Threads",
      unitPrice: 3_200,
    };
    expect(parseSnapshotItems([item])).toEqual([item]);
    expect(parseSnapshotItems([{ slotKey: "top" }])).toEqual([]);
    expect(parseSnapshotItems(null)).toEqual([]);
  });
});
