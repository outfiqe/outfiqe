import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({ $queryRaw: vi.fn() }));

vi.mock("#db/prisma.js", () => ({ prisma: prismaMock }));

const { computeViewerEngagementAffinity, listCreatorsByHashtagAffinity } =
  await import("./creator-engagement-affinity.utils.js");

afterEach(() => {
  vi.clearAllMocks();
});

describe("computeViewerEngagementAffinity", () => {
  it("returns empty affinity when the viewer engaged with nothing", async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);

    const affinity = await computeViewerEngagementAffinity("viewer-1", 60);

    expect(affinity.engagedCreatorIds.size).toBe(0);
    expect(affinity.hashtagWeights.size).toBe(0);
  });

  it("collects distinct creators and tallies hashtag weight across repeats", async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { creator_id: "creator-1", tag: "summer" },
      { creator_id: "creator-1", tag: "summer" },
      { creator_id: "creator-1", tag: null },
      { creator_id: "creator-2", tag: "denim" },
    ]);

    const affinity = await computeViewerEngagementAffinity("viewer-1", 60);

    expect(affinity.engagedCreatorIds).toEqual(new Set(["creator-1", "creator-2"]));
    expect(affinity.hashtagWeights.get("summer")).toBe(2);
    expect(affinity.hashtagWeights.get("denim")).toBe(1);
  });
});

describe("listCreatorsByHashtagAffinity", () => {
  it("returns an empty list without querying when there are no tags", async () => {
    const candidates = await listCreatorsByHashtagAffinity([], 60, 10);

    expect(candidates).toEqual([]);
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
  });

  it("maps matching-post counts to numbers", async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { creator_id: "creator-1", matching_posts: 5n },
      { creator_id: "creator-2", matching_posts: 1n },
    ]);

    const candidates = await listCreatorsByHashtagAffinity(["summer"], 60, 10);

    expect(candidates).toEqual([
      { creatorId: "creator-1", matchingPosts: 5 },
      { creatorId: "creator-2", matchingPosts: 1 },
    ]);
  });
});
