import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const serverApiRequest = vi.fn();
vi.mock("@/shared/lib/serverApiClient", () => ({
  serverApiRequest: (...args: unknown[]) => serverApiRequest(...args),
}));

const getServerAccessToken = vi.fn();
vi.mock("@/features/auth/api/serverAuth", () => ({
  getServerAccessToken: () => getServerAccessToken(),
}));

const { getFeaturedCreatorLooksServer } = await import("./getProductsServer");

const rawFeedPage = {
  posts: [
    {
      id: "look-1",
      creator: { id: "creator-1", name: "Ava", handle: "ava", isApproved: true },
      imageUrl: "https://example.test/look.jpg",
      images: [],
      image: null,
      caption: null,
      likeCount: 0,
      commentCount: 0,
      saveCount: 0,
      isLiked: true,
      isSaved: false,
      isFollowingCreator: true,
      taggedProducts: [],
      hashtags: [],
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  nextCursor: null,
};

beforeEach(() => {
  serverApiRequest.mockReset();
  getServerAccessToken.mockReset();
});

describe("getFeaturedCreatorLooksServer", () => {
  it("forwards the viewer's access token so isLiked/isSaved/isFollowingCreator are personalized", async () => {
    getServerAccessToken.mockResolvedValue("viewer-token");
    serverApiRequest.mockResolvedValue(rawFeedPage);

    const looks = await getFeaturedCreatorLooksServer();

    expect(serverApiRequest).toHaveBeenCalledWith("/creator-looks", {
      accessToken: "viewer-token",
    });
    expect(looks[0]?.isLiked).toBe(true);
    expect(looks[0]?.isFollowingCreator).toBe(true);
  });

  it("requests anonymously when there is no session", async () => {
    getServerAccessToken.mockResolvedValue(null);
    serverApiRequest.mockResolvedValue(rawFeedPage);

    await getFeaturedCreatorLooksServer();

    expect(serverApiRequest).toHaveBeenCalledWith("/creator-looks", {
      accessToken: undefined,
    });
  });

  it("returns an empty list when the request fails", async () => {
    getServerAccessToken.mockResolvedValue(null);
    serverApiRequest.mockRejectedValue(new Error("down"));

    const looks = await getFeaturedCreatorLooksServer();

    expect(looks).toEqual([]);
  });
});
