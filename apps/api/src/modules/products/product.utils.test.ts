import { describe, expect, it } from "vitest";

import { DiscountType, ProductStatus } from "#generated/prisma/enums.js";

import type { ProductDiscountRecord, ProductWithStockSizesAndImages } from "./product.types.js";
import {
  isLowStock,
  isNew,
  isUuid,
  sumStock,
  toBrandSummary,
  toDiscountView,
  toPublicProduct,
  toSuggestion,
} from "./product.utils.js";

const buildDiscount = (overrides: Partial<ProductDiscountRecord> = {}): ProductDiscountRecord => ({
  id: "discount-1",
  discountType: DiscountType.PERCENT,
  percentBasisPoints: 2_000,
  fixedAmount: null,
  startsAt: new Date("2026-01-01T00:00:00.000Z"),
  endsAt: null,
  isActive: true,
  ...overrides,
});

const buildProduct = (
  overrides: Partial<ProductWithStockSizesAndImages> = {},
): ProductWithStockSizesAndImages => ({
  id: "product-1",
  brandId: "brand-1",
  name: "Jacket",
  price: 2_000,
  productTypeId: "type-1",
  imageUrl: "jacket.png",
  lowStock: false,
  status: ProductStatus.APPROVED,
  reviewedAt: null,
  reviewedById: null,
  wornByCount: 0,
  createdAt: new Date("2020-01-01T00:00:00.000Z"),
  updatedAt: new Date("2020-01-01T00:00:00.000Z"),
  deletedAt: null,
  avgRating: null,
  reviewCount: 0,
  rating1Count: 0,
  rating2Count: 0,
  rating3Count: 0,
  rating4Count: 0,
  rating5Count: 0,
  brand: { name: "Acme" },
  categories: [{ slug: "outerwear", name: "Outerwear" }],
  productType: { slug: "jacket", label: "Jacket" },
  totalStock: 10,
  sizes: [{ id: "size-1", label: "M", stock: 10 }],
  images: [{ url: "jacket.png" }],
  ...overrides,
});

describe("isUuid", () => {
  it("accepts a valid uuid", () => {
    expect(isUuid("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
  });

  it("rejects a non-uuid string", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
  });
});

describe("isNew", () => {
  it("is true for a product created just now", () => {
    expect(isNew(new Date())).toBe(true);
  });

  it("is false for a product created long ago", () => {
    expect(isNew(new Date("2000-01-01T00:00:00.000Z"))).toBe(false);
  });
});

describe("sumStock", () => {
  it("sums stock across sizes", () => {
    expect(sumStock([{ stock: 3 }, { stock: 7 }])).toBe(10);
  });

  it("returns 0 for no sizes", () => {
    expect(sumStock([])).toBe(0);
  });
});

describe("isLowStock", () => {
  it("is false at zero stock", () => {
    expect(isLowStock(0)).toBe(false);
  });

  it("is true just above zero and at the threshold", () => {
    expect(isLowStock(1)).toBe(true);
    expect(isLowStock(5)).toBe(true);
  });

  it("is false above the threshold", () => {
    expect(isLowStock(6)).toBe(false);
  });
});

describe("toDiscountView", () => {
  it("serializes dates and passes through the discount's fields", () => {
    const discount = buildDiscount({
      startsAt: new Date("2026-01-01T00:00:00.000Z"),
      endsAt: new Date("2026-02-01T00:00:00.000Z"),
    });
    expect(toDiscountView(discount)).toEqual({
      id: "discount-1",
      discountType: DiscountType.PERCENT,
      percentBasisPoints: 2_000,
      fixedAmount: null,
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: "2026-02-01T00:00:00.000Z",
    });
  });

  it("serializes a null endsAt as null", () => {
    expect(toDiscountView(buildDiscount({ endsAt: null })).endsAt).toBeNull();
  });
});

describe("toSuggestion", () => {
  it("flattens the brand name and picks the display fields", () => {
    expect(toSuggestion(buildProduct())).toEqual({
      id: "product-1",
      name: "Jacket",
      brand: "Acme",
      imageUrl: "jacket.png",
    });
  });
});

describe("toPublicProduct", () => {
  it("shows the list price as the effective price when there is no active discount", () => {
    const view = toPublicProduct(buildProduct());
    expect(view.price).toBe(2_000);
    expect(view.effectivePrice).toBe(2_000);
    expect(view.discountPercent).toBeNull();
  });

  it("computes the discounted effective price and percent from an active discount", () => {
    const view = toPublicProduct(buildProduct({ discounts: [buildDiscount()] }));
    expect(view.effectivePrice).toBe(1_600);
    expect(view.discountPercent).toBe(20);
  });

  it("falls back to the stored lowStock flag when totalStock is not supplied", () => {
    const { totalStock: _totalStock, ...withoutStock } = buildProduct({ lowStock: true });
    const view = toPublicProduct(withoutStock);
    expect(view.lowStock).toBe(true);
  });

  it("computes lowStock from totalStock when it is supplied", () => {
    const view = toPublicProduct(buildProduct({ totalStock: 2, lowStock: false }));
    expect(view.lowStock).toBe(true);
  });

  it("defaults creatorBuyerCount and unitsSold to 0 when absent", () => {
    const view = toPublicProduct(buildProduct());
    expect(view.creatorBuyerCount).toBe(0);
    expect(view.unitsSold).toBe(0);
  });
});

describe("toBrandSummary", () => {
  it("reports no active discount and the list price as effective when none is set", () => {
    const summary = toBrandSummary(buildProduct());
    expect(summary.price).toBe(2_000);
    expect(summary.effectivePrice).toBe(2_000);
    expect(summary.activeDiscount).toBeNull();
  });

  it("includes the active discount view and the discounted effective price", () => {
    const discount = buildDiscount({
      discountType: DiscountType.FIXED,
      percentBasisPoints: null,
      fixedAmount: 300,
    });
    const summary = toBrandSummary(buildProduct({ discounts: [discount] }));
    expect(summary.effectivePrice).toBe(1_700);
    expect(summary.activeDiscount).toEqual({
      id: "discount-1",
      discountType: DiscountType.FIXED,
      percentBasisPoints: null,
      fixedAmount: 300,
      startsAt: discount.startsAt.toISOString(),
      endsAt: null,
    });
  });

  it("maps categories, images and stock into the brand-facing shape", () => {
    const summary = toBrandSummary(buildProduct());
    expect(summary.categories).toEqual(["Outerwear"]);
    expect(summary.categorySlugs).toEqual(["outerwear"]);
    expect(summary.imageUrls).toEqual(["jacket.png"]);
    expect(summary.type).toBe("jacket");
    expect(summary.lowStock).toBe(false);
  });
});
