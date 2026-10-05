import { PUBLIC_BUILD_SORT } from "@outfiqe/utils";
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
  toItemAvailability,
  toLiveUnitPrice,
  toPublicFeedCursorValue,
  toVersionHeaderValue,
  toViewerRole,
} from "./outfit.utils.js";

describe("parseVersionHeader", () => {
  it("reads a plain number or a quoted one", () => {
    expect(parseVersionHeader("3")).toBe(3);
    expect(parseVersionHeader('"12"')).toBe(12);
    expect(parseVersionHeader('  "0"  ')).toBe(0);
  });

  it("refuses anything that isn't a whole version number", () => {
    for (const headerValue of ["latest", "-1", "1.5", '"abc"', "*", 'W/"7"', ""]) {
      expect(parseVersionHeader(headerValue)).toBeNull();
    }
  });

  it("round-trips with toVersionHeaderValue", () => {
    expect(parseVersionHeader(toVersionHeaderValue(42))).toBe(42);
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

describe("toPublicFeedCursorValue", () => {
  const feedRow = {
    id: "outfit-1",
    madePublicAt: new Date("2026-10-01T08:30:00.000Z"),
    likeCount: 14,
    total: 7_450,
  };

  it("keys each sort on the column it orders by", () => {
    expect(toPublicFeedCursorValue(feedRow, PUBLIC_BUILD_SORT.NEWEST)).toBe(
      "2026-10-01T08:30:00.000Z",
    );
    expect(toPublicFeedCursorValue(feedRow, PUBLIC_BUILD_SORT.MOST_CHERIQED)).toBe("14");
    expect(toPublicFeedCursorValue(feedRow, PUBLIC_BUILD_SORT.PRICE_LOW)).toBe("7450");
    expect(toPublicFeedCursorValue(feedRow, PUBLIC_BUILD_SORT.PRICE_HIGH)).toBe("7450");
  });
});
