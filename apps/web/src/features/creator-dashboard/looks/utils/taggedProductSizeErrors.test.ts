import { describe, expect, it } from "vitest";

import {
  collectTaggedProductSizeErrors,
  SIZE_REQUIRED_SUMMARY,
  summarizeTaggedProductErrors,
} from "./taggedProductSizeErrors";

const taggedProducts = [{ productId: "p1" }, { productId: "p2" }];

describe("collectTaggedProductSizeErrors", () => {
  it("maps per-item sizeWorn errors to their product id", () => {
    const errors = [undefined, { sizeWorn: { message: "Size is required" } }];

    expect(collectTaggedProductSizeErrors(errors, taggedProducts)).toEqual({
      p2: "Size is required",
    });
  });

  it("returns an empty map when there are no array errors", () => {
    expect(collectTaggedProductSizeErrors(undefined, taggedProducts)).toEqual({});
    expect(collectTaggedProductSizeErrors({ message: "Pick a product" }, taggedProducts)).toEqual(
      {},
    );
  });
});

describe("summarizeTaggedProductErrors", () => {
  it("prefers an array-level message", () => {
    expect(summarizeTaggedProductErrors({ message: "Pick fewer products" }, {})).toBe(
      "Pick fewer products",
    );
  });

  it("falls back to the size summary when only per-item errors exist", () => {
    expect(summarizeTaggedProductErrors([{ sizeWorn: { message: "x" } }], { p1: "x" })).toBe(
      SIZE_REQUIRED_SUMMARY,
    );
  });

  it("returns undefined when there is nothing to report", () => {
    expect(summarizeTaggedProductErrors(undefined, {})).toBeUndefined();
  });
});
