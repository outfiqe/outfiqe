import { describe, expect, it } from "vitest";

import { CommissionSource } from "#generated/prisma/enums.js";

import type { PricedCheckoutLine } from "./checkout.types.js";
import { toAttributedOrderItems } from "./checkout.utils.js";

const CLICKED_AT = new Date("2026-01-01T00:00:00.000Z");

const pricedLine = (overrides: Partial<PricedCheckoutLine> = {}): PricedCheckoutLine => ({
  productId: "product-1",
  sizeId: "size-1",
  qty: 2,
  listUnitPrice: 1200,
  brandId: "brand-1",
  unitPrice: 1000,
  brandDiscountAmount: 200,
  platformDiscountAmount: 50,
  ...overrides,
});

describe("toAttributedOrderItems", () => {
  it("keeps the line's prices, drops the brand id, and leaves an unattributed line without a source", () => {
    const [orderItem] = toAttributedOrderItems([pricedLine()], [null]);

    expect(orderItem).toEqual({
      productId: "product-1",
      sizeId: "size-1",
      qty: 2,
      listUnitPrice: 1200,
      unitPrice: 1000,
      brandDiscountAmount: 200,
      platformDiscountAmount: 50,
      attributionSource: undefined,
    });
    expect(orderItem).not.toHaveProperty("brandId");
  });

  it("credits the build and its version for a sale that came from an outfit build", () => {
    const [orderItem] = toAttributedOrderItems(
      [pricedLine()],
      [
        {
          source: CommissionSource.OUTFIT_BUILD,
          visitId: "visit-1",
          outfitId: "outfit-1",
          outfitVersion: 3,
          clickedAt: CLICKED_AT,
        },
      ],
    );

    expect(orderItem).toMatchObject({
      attributedOutfitId: "outfit-1",
      attributedOutfitVersion: 3,
      attributionSource: CommissionSource.OUTFIT_BUILD,
    });
    expect(orderItem).not.toHaveProperty("attributedCreatorId");
  });

  it("records the look, not a link, for a tag click", () => {
    const [orderItem] = toAttributedOrderItems(
      [pricedLine()],
      [
        {
          source: CommissionSource.TAG_CLICK,
          creatorId: "creator-1",
          clickId: "click-1",
          referenceId: "look-1",
          clickedAt: CLICKED_AT,
        },
      ],
    );

    expect(orderItem).toMatchObject({
      attributedCreatorId: "creator-1",
      attributedCreatorLookId: "look-1",
      attributedLinkId: undefined,
      attributionSource: CommissionSource.TAG_CLICK,
    });
  });

  it("records the link, not a look, for a creator link click", () => {
    const [orderItem] = toAttributedOrderItems(
      [pricedLine()],
      [
        {
          source: CommissionSource.EXTERNAL_LINK,
          creatorId: "creator-1",
          clickId: "click-1",
          referenceId: "link-1",
          clickedAt: CLICKED_AT,
        },
      ],
    );

    expect(orderItem).toMatchObject({
      attributedCreatorId: "creator-1",
      attributedCreatorLookId: undefined,
      attributedLinkId: "link-1",
      attributionSource: CommissionSource.EXTERNAL_LINK,
    });
  });

  it("matches each line to the attribution at the same position", () => {
    const orderItems = toAttributedOrderItems(
      [pricedLine({ productId: "product-1" }), pricedLine({ productId: "product-2" })],
      [
        null,
        {
          source: CommissionSource.INTERNAL_LINK,
          creatorId: "creator-2",
          clickId: "click-2",
          referenceId: "link-2",
          clickedAt: CLICKED_AT,
        },
      ],
    );

    expect(orderItems.map((orderItem) => orderItem.attributedCreatorId)).toEqual([
      undefined,
      "creator-2",
    ]);
  });
});
