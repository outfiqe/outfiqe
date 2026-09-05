import { describe, expect, it } from "vitest";

import {
  TAG_TREND_CURRENT_WINDOW_END_HOURS,
  TAG_TREND_MIN_BUCKETS_FOR_OWN_BASELINE,
  TREND_CURRENT_WINDOW_END_HOURS,
  TREND_FRESHNESS_MULTIPLIER,
  TREND_FRESHNESS_WINDOW_MS,
  TREND_MIN_BUCKETS_FOR_OWN_BASELINE,
} from "./creatorLook.constants.js";
import type { PostMetricBucket, TagMetricBucket } from "./creatorLook.types.js";
import {
  computeGlobalPostBaseline,
  computeGlobalTagBaseline,
  computeOwnPostBaseline,
  computeOwnTagBaseline,
  groupPostBucketsByLook,
  groupTagBucketsByTag,
  isLikelyBotUserAgent,
  isWithinPostFreshnessWindow,
  postBucketActivity,
  scoreCreatorMomentum,
  scorePost,
  scoreTag,
  tagBucketActivity,
  toEditDetail,
  toSuggestion,
  toSummary,
} from "./creatorLook.utils.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;

const bucketAgeHoursAgo = (
  lookId: string,
  ageHours: number,
  activity: Partial<Omit<PostMetricBucket, "lookId" | "bucketStart">> = {},
): PostMetricBucket => ({
  lookId,
  bucketStart: new Date(NOW.getTime() - ageHours * HOUR_MS),
  likes: 0,
  comments: 0,
  saves: 0,
  tagClicks: 0,
  ...activity,
});

const tagBucketAgeHoursAgo = (
  tag: string,
  ageHours: number,
  postCount: number,
): TagMetricBucket => ({
  tag,
  bucketStart: new Date(NOW.getTime() - ageHours * HOUR_MS),
  postCount,
});

describe("isLikelyBotUserAgent", () => {
  it("treats a missing User-Agent as a bot", () => {
    expect(isLikelyBotUserAgent(undefined)).toBe(true);
  });

  it.each([
    "Googlebot/2.1 (+http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "curl/8.0.1",
    "Wget/1.21",
    "python-requests/2.31.0",
    "axios/1.6.0",
    "Mozilla/5.0 (compatible; DiscordBot/2.0; +https://discordapp.com)",
    "facebookexternalhit/1.1",
  ])("flags a known crawler User-Agent: %s", (userAgent) => {
    expect(isLikelyBotUserAgent(userAgent)).toBe(true);
  });

  it.each([
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  ])("allows a real browser User-Agent: %s", (userAgent) => {
    expect(isLikelyBotUserAgent(userAgent)).toBe(false);
  });
});

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
        },
        images: [],
        likeCount: 0,
        commentCount: 0,
        saveCount: 0,
        isLiked: false,
        isSaved: false,
        isFollowingCreator: false,
        taggedProducts: [],
        hashtags: [],
        createdAt: NOW,
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
      caption: "fit check",
      taggedProducts: [{ ...baseTaggedProduct, sizeWorn: "M" }],
    });

    expect(detail.imageUrls).toEqual([
      "https://cdn.example.com/a.png",
      "https://cdn.example.com/b.png",
    ]);
    expect(detail.taggedProducts).toEqual([
      {
        productId: "product-1",
        sizeWorn: "M",
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
      caption: null,
      taggedProducts: [{ ...baseTaggedProduct, sizeWorn: null }],
    });

    expect(detail.imageUrls).toEqual(["https://cdn.example.com/cover.png"]);
    expect(detail.taggedProducts[0]?.sizeWorn).toBe("");
  });
});

describe("postBucketActivity", () => {
  it("weights each signal by the configured trend weight", () => {
    const activity = postBucketActivity({ likes: 3, comments: 1, saves: 2, tagClicks: 0 });

    expect(activity).toBeCloseTo(
      1.5 * Math.log1p(3) + 3.0 * Math.log1p(1) + 3.0 * Math.log1p(2) + 2.0 * Math.log1p(0),
    );
  });
});

describe("groupPostBucketsByLook", () => {
  it("groups buckets under their look id, preserving arrival order", () => {
    const bucketA1 = bucketAgeHoursAgo("look-a", 1);
    const bucketB1 = bucketAgeHoursAgo("look-b", 2);
    const bucketA2 = bucketAgeHoursAgo("look-a", 3);

    const grouped = groupPostBucketsByLook([bucketA1, bucketB1, bucketA2]);

    expect(grouped.get("look-a")).toEqual([bucketA1, bucketA2]);
    expect(grouped.get("look-b")).toEqual([bucketB1]);
  });

  it("returns an empty map for no buckets", () => {
    expect(groupPostBucketsByLook([]).size).toBe(0);
  });
});

describe("computeOwnPostBaseline", () => {
  it("reports zero non-empty windows when there is no activity", () => {
    expect(computeOwnPostBaseline([], NOW, 14)).toEqual({ average: 0, nonEmptyWindows: 0 });
  });

  it("averages activity across windows that had any", () => {
    const buckets = [
      bucketAgeHoursAgo("look-a", 10, { likes: 5 }),
      bucketAgeHoursAgo("look-a", 40, { likes: 5 }),
    ];

    const baseline = computeOwnPostBaseline(buckets, NOW, 14);

    expect(baseline.nonEmptyWindows).toBe(2);
    expect(baseline.average).toBeGreaterThan(0);
  });
});

describe("computeGlobalPostBaseline", () => {
  it("only folds in looks that had at least one non-empty window", () => {
    const activeBucketsByLook = new Map([
      ["look-active", [bucketAgeHoursAgo("look-active", 5, { likes: 4 })]],
      ["look-idle", [bucketAgeHoursAgo("look-idle", 5, { likes: 0 })]],
    ]);

    const globalBaseline = computeGlobalPostBaseline(activeBucketsByLook, NOW, 14);

    expect(globalBaseline).toBeGreaterThan(0);
  });

  it("returns zero when no look had any activity", () => {
    expect(computeGlobalPostBaseline(new Map(), NOW, 14)).toBe(0);
  });
});

describe("isWithinPostFreshnessWindow", () => {
  it("is fresh exactly at the boundary of the freshness window", () => {
    const createdAt = new Date(NOW.getTime() - TREND_FRESHNESS_WINDOW_MS);
    expect(isWithinPostFreshnessWindow(createdAt, NOW)).toBe(true);
  });

  it("is stale just past the freshness window", () => {
    const createdAt = new Date(NOW.getTime() - TREND_FRESHNESS_WINDOW_MS - 1);
    expect(isWithinPostFreshnessWindow(createdAt, NOW)).toBe(false);
  });
});

describe("scorePost", () => {
  const globalBaseline = 1;

  it("only counts buckets inside the current window toward recentActivity", () => {
    const buckets = [
      bucketAgeHoursAgo("look-1", -1, { likes: 99 }),
      bucketAgeHoursAgo("look-1", 2, { likes: 3, comments: 1, saves: 0, tagClicks: 2 }),
      bucketAgeHoursAgo("look-1", TREND_CURRENT_WINDOW_END_HOURS, { likes: 99 }),
    ];

    const { recentActivity } = scorePost({
      lookId: "look-1",
      creatorId: "creator-1",
      buckets,
      lookCreatedAt: NOW,
      globalBaseline,
      now: NOW,
    });

    expect(recentActivity).toEqual({ likes: 3, comments: 1, saves: 0, tagClicks: 2 });
  });

  it("falls back to the global baseline when the look lacks enough history", () => {
    const buckets = [bucketAgeHoursAgo("look-1", 2, { likes: 3 })];

    const { baseline } = scorePost({
      lookId: "look-1",
      creatorId: "creator-1",
      buckets,
      lookCreatedAt: NOW,
      globalBaseline,
      now: NOW,
    });

    expect(baseline.source).toBe("global");
    expect(baseline.value).toBe(globalBaseline);
  });

  it("uses the look's own baseline once it has enough non-empty windows", () => {
    const buckets = Array.from({ length: TREND_MIN_BUCKETS_FOR_OWN_BASELINE }, (_, index) =>
      bucketAgeHoursAgo("look-1", 10 + index * 10, { likes: 5 }),
    );

    const { baseline } = scorePost({
      lookId: "look-1",
      creatorId: "creator-1",
      buckets,
      lookCreatedAt: NOW,
      globalBaseline,
      now: NOW,
    });

    expect(baseline.source).toBe("post");
  });

  it("boosts the score while the look is inside its freshness window", () => {
    const buckets = [bucketAgeHoursAgo("look-1", 2, { likes: 5 })];

    const fresh = scorePost({
      lookId: "look-1",
      creatorId: "creator-1",
      buckets,
      lookCreatedAt: NOW,
      globalBaseline,
      now: NOW,
    });
    const stale = scorePost({
      lookId: "look-1",
      creatorId: "creator-1",
      buckets,
      lookCreatedAt: new Date(NOW.getTime() - TREND_FRESHNESS_WINDOW_MS - 1),
      globalBaseline,
      now: NOW,
    });

    expect(fresh.freshnessMultiplier).toBe(TREND_FRESHNESS_MULTIPLIER);
    expect(stale.freshnessMultiplier).toBe(1);
  });
});

describe("scoreCreatorMomentum", () => {
  it("falls back to the global baseline when the creator lacks enough history", () => {
    const buckets = [bucketAgeHoursAgo("look-1", 2, { likes: 3 })];

    const momentum = scoreCreatorMomentum({
      creatorId: "creator-1",
      buckets,
      globalBaseline: 1,
      now: NOW,
    });

    expect(momentum.creatorId).toBe("creator-1");
    expect(Number.isFinite(momentum.momentum)).toBe(true);
  });

  it("uses the creator's own baseline once it has enough non-empty windows", () => {
    const buckets = Array.from({ length: TREND_MIN_BUCKETS_FOR_OWN_BASELINE }, (_, index) =>
      bucketAgeHoursAgo("look-1", 10 + index * 10, { likes: 5 }),
    );

    const momentum = scoreCreatorMomentum({
      creatorId: "creator-1",
      buckets,
      globalBaseline: 1,
      now: NOW,
    });

    expect(Number.isFinite(momentum.momentum)).toBe(true);
  });
});

describe("tagBucketActivity", () => {
  it("scales log-dampened post counts by the tag signal weight", () => {
    expect(tagBucketActivity({ postCount: 5 })).toBeCloseTo(1 * Math.log1p(5));
  });
});

describe("groupTagBucketsByTag", () => {
  it("groups buckets under their tag, preserving arrival order", () => {
    const bucketA1 = tagBucketAgeHoursAgo("summer", 1, 3);
    const bucketB1 = tagBucketAgeHoursAgo("denim", 2, 1);
    const bucketA2 = tagBucketAgeHoursAgo("summer", 3, 4);

    const grouped = groupTagBucketsByTag([bucketA1, bucketB1, bucketA2]);

    expect(grouped.get("summer")).toEqual([bucketA1, bucketA2]);
    expect(grouped.get("denim")).toEqual([bucketB1]);
  });
});

describe("computeOwnTagBaseline", () => {
  it("reports zero non-empty windows when there is no activity", () => {
    expect(computeOwnTagBaseline([], NOW, 14)).toEqual({ average: 0, nonEmptyWindows: 0 });
  });
});

describe("computeGlobalTagBaseline", () => {
  it("only folds in tags that had at least one non-empty window", () => {
    const bucketsByTag = new Map([
      ["summer", [tagBucketAgeHoursAgo("summer", 5, 4)]],
      ["idle-tag", [tagBucketAgeHoursAgo("idle-tag", 5, 0)]],
    ]);

    expect(computeGlobalTagBaseline(bucketsByTag, NOW, 14)).toBeGreaterThan(0);
  });

  it("returns zero when no tag had any activity", () => {
    expect(computeGlobalTagBaseline(new Map(), NOW, 14)).toBe(0);
  });
});

describe("scoreTag", () => {
  it("only counts buckets inside the current window toward recentActivity", () => {
    const buckets = [
      tagBucketAgeHoursAgo("summer", -1, 99),
      tagBucketAgeHoursAgo("summer", 2, 3),
      tagBucketAgeHoursAgo("summer", TAG_TREND_CURRENT_WINDOW_END_HOURS, 99),
    ];

    const { recentActivity } = scoreTag({
      tag: "summer",
      buckets,
      globalBaseline: 1,
      now: NOW,
    });

    expect(recentActivity).toEqual({ postCount: 3 });
  });

  it("falls back to the global baseline when the tag lacks enough history", () => {
    const buckets = [tagBucketAgeHoursAgo("summer", 2, 3)];

    const { baseline } = scoreTag({ tag: "summer", buckets, globalBaseline: 1, now: NOW });

    expect(baseline.source).toBe("global");
    expect(baseline.value).toBe(1);
  });

  it("uses the tag's own baseline once it has enough non-empty windows", () => {
    const buckets = Array.from({ length: TAG_TREND_MIN_BUCKETS_FOR_OWN_BASELINE }, (_, index) =>
      tagBucketAgeHoursAgo("summer", 10 + index * 10, 5),
    );

    const { baseline } = scoreTag({ tag: "summer", buckets, globalBaseline: 1, now: NOW });

    expect(baseline.source).toBe("tag");
  });
});
