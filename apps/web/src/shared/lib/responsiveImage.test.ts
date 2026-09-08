import { describe, expect, it } from "vitest";

import { responsiveImageSchema } from "./responsiveImage";

describe("responsiveImageSchema", () => {
  it("accepts a fallback-only image with no sources", () => {
    const parsed = responsiveImageSchema.parse({
      url: "https://cdn.outfiqe.test/original.jpg",
      lqip: null,
      sources: [],
    });

    expect(parsed.sources).toEqual([]);
    expect(parsed.lqip).toBeNull();
  });

  it("accepts per-format sources with a base64 lqip", () => {
    const parsed = responsiveImageSchema.parse({
      url: "https://cdn.outfiqe.test/original.jpg",
      lqip: "data:image/webp;base64,blur",
      sources: [
        { format: "avif", srcSet: "https://cdn.outfiqe.test/320.avif 320w" },
        { format: "webp", srcSet: "https://cdn.outfiqe.test/320.webp 320w" },
      ],
    });

    expect(parsed.sources.map((source) => source.format)).toEqual(["avif", "webp"]);
  });

  it("rejects an unknown source format", () => {
    const result = responsiveImageSchema.safeParse({
      url: "https://cdn.outfiqe.test/original.jpg",
      lqip: null,
      sources: [{ format: "gif", srcSet: "x 1w" }],
    });

    expect(result.success).toBe(false);
  });
});
