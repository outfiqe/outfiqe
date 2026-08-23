import { describe, expect, it } from "vitest";

import type { ProductReviewRow } from "./product-review.types.js";
import { toReviewRecord } from "./product-review.utils.js";

const buildRow = (overrides: Partial<ProductReviewRow> = {}): ProductReviewRow => ({
  id: "review-1",
  productId: "product-1",
  rating: 4,
  title: "Great fit",
  body: "Runs true to size and the fabric feels premium.",
  helpfulCount: 2,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  user: { id: "user-1", name: "Priya Shah", handle: "priya-shah", avatarUrl: null },
  images: [{ url: "https://cdn.outfiqe.test/review-1.jpg" }],
  ...overrides,
});

describe("toReviewRecord", () => {
  it("flattens the images relation to a plain url array and the user relation to author", () => {
    const record = toReviewRecord(buildRow(), new Set());

    expect(record.author).toEqual({
      id: "user-1",
      name: "Priya Shah",
      handle: "priya-shah",
      avatarUrl: null,
    });
    expect(record.images).toEqual(["https://cdn.outfiqe.test/review-1.jpg"]);
  });

  it("marks hasVotedHelpful true only when the viewer's vote set contains this review's id", () => {
    const row = buildRow({ id: "review-42" });

    expect(toReviewRecord(row, new Set(["review-42"])).hasVotedHelpful).toBe(true);
    expect(toReviewRecord(row, new Set(["some-other-review"])).hasVotedHelpful).toBe(false);
    expect(toReviewRecord(row, new Set()).hasVotedHelpful).toBe(false);
  });
});
