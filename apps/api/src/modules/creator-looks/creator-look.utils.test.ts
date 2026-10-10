import { describe, expect, it } from "vitest";

import { toEditDetail, toSuggestion, toSummary } from "./creator-look.utils.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("toSuggestion", () => {
  it("keeps only the fields a suggestion card needs", () => {
    expect(
      toSuggestion({
        id: "look-1",
        imageUrl: "https://cdn.example.com/look.png",
        caption: "outfit of the day",
        creator: {
          id: "creator-1",
          name: "Ada",
          handle: "ada",
          isApproved: true,
          heightCm: null,
        },
        images: [],
        image: { url: "https://cdn.example.com/look.png", lqip: null, sources: [] },
        layout: "PORTRAIT",
        likeCount: 0,
        commentCount: 0,
        saveCount: 0,
        isLiked: false,
        isSaved: false,
        isFollowingCreator: false,
        taggedProducts: [],
        hashtags: [],
        createdAt: NOW,
        isTrending: false,
      }),
    ).toEqual({
      id: "look-1",
      imageUrl: "https://cdn.example.com/look.png",
      caption: "outfit of the day",
      creator: { name: "Ada", handle: "ada" },
    });
  });
});

describe("toSummary", () => {
  it("unwraps tagged products down to their product record", () => {
    expect(
      toSummary({
        id: "look-1",
        creatorId: "creator-1",
        imageUrl: "https://cdn.example.com/look.png",
        layout: "PORTRAIT",
        caption: null,
        createdAt: NOW,
        taggedProducts: [
          { product: { id: "product-1", name: "Jacket", imageUrl: "jacket.png" } },
          { product: { id: "product-2", name: "Boots", imageUrl: null } },
        ],
      }),
    ).toEqual({
      id: "look-1",
      creatorId: "creator-1",
      imageUrl: "https://cdn.example.com/look.png",
      layout: "PORTRAIT",
      caption: null,
      createdAt: NOW,
      taggedProducts: [
        { id: "product-1", name: "Jacket", imageUrl: "jacket.png" },
        { id: "product-2", name: "Boots", imageUrl: null },
      ],
    });
  });

  it("returns an empty list when nothing is tagged", () => {
    expect(
      toSummary({
        id: "look-1",
        creatorId: "creator-1",
        imageUrl: "https://cdn.example.com/look.png",
        layout: "PORTRAIT",
        caption: "hi",
        createdAt: NOW,
        taggedProducts: [],
      }).taggedProducts,
    ).toEqual([]);
  });
});

describe("toEditDetail", () => {
  const baseTaggedProduct = {
    productId: "product-1",
    sizeWorn: "M" as string | null,
    reviewStatus: "APPROVED" as const,
    rejectionReason: null,
    rejectionNote: null,
    reRequestCount: 0,
    product: {
      id: "product-1",
      name: "Jacket",
      price: 4500,
      imageUrl: "jacket.png",
      brand: { name: "Acme" },
    },
  };

  it("uses the multi-image list when images were uploaded", () => {
    const detail = toEditDetail({
      id: "look-1",
      imageUrl: "https://cdn.example.com/cover.png",
      images: [{ url: "https://cdn.example.com/a.png" }, { url: "https://cdn.example.com/b.png" }],
      layout: "SQUARE",
      caption: "fit check",
      taggedProducts: [{ ...baseTaggedProduct, sizeWorn: "M" }],
    });

    expect(detail.imageUrls).toEqual([
      "https://cdn.example.com/a.png",
      "https://cdn.example.com/b.png",
    ]);
    expect(detail.layout).toBe("SQUARE");
    expect(detail.taggedProducts).toEqual([
      {
        productId: "product-1",
        sizeWorn: "M",
        reviewStatus: "APPROVED",
        rejectionReason: null,
        rejectionNote: null,
        canReRequest: false,
        product: {
          id: "product-1",
          name: "Jacket",
          brand: "Acme",
          price: 4500,
          imageUrl: "jacket.png",
        },
      },
    ]);
  });

  it("falls back to the cover image when no images were uploaded", () => {
    const detail = toEditDetail({
      id: "look-1",
      imageUrl: "https://cdn.example.com/cover.png",
      images: [],
      layout: "PORTRAIT",
      caption: null,
      taggedProducts: [{ ...baseTaggedProduct, sizeWorn: null }],
    });

    expect(detail.imageUrls).toEqual(["https://cdn.example.com/cover.png"]);
    expect(detail.taggedProducts[0]?.sizeWorn).toBe("");
  });

  it("lets a muse re-request a rejected tag until the cap is reached", () => {
    const detail = toEditDetail({
      id: "look-1",
      imageUrl: "https://cdn.example.com/cover.png",
      images: [],
      layout: "PORTRAIT",
      caption: null,
      taggedProducts: [
        {
          ...baseTaggedProduct,
          productId: "retry-ok",
          reviewStatus: "REJECTED",
          rejectionReason: "MISREPRESENTS_PRODUCT",
          rejectionNote: "Wrong colourway",
          reRequestCount: 2,
        },
        {
          ...baseTaggedProduct,
          productId: "retry-locked",
          reviewStatus: "REJECTED",
          rejectionReason: "NOT_OUR_PRODUCT",
          rejectionNote: null,
          reRequestCount: 3,
        },
      ],
    });

    expect(detail.taggedProducts[0]).toMatchObject({
      reviewStatus: "REJECTED",
      rejectionReason: "MISREPRESENTS_PRODUCT",
      rejectionNote: "Wrong colourway",
      canReRequest: true,
    });
    expect(detail.taggedProducts[1]).toMatchObject({ canReRequest: false });
  });
});
