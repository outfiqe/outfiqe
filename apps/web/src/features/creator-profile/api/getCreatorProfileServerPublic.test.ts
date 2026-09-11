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

const { getCreatorProfileServerPublic } = await import("./getCreatorProfileServerPublic");

const creatorProfile = {
  userId: "creator-1",
  name: "Sabin",
  handle: "sabin",
  avatarUrl: null,
  avatarImage: null,
  heightCm: null,
  showHeight: false,
  hideFromLeaderboards: false,
  creatorStatus: "APPROVED",
  postsCount: 4,
  followerCount: 10,
  followingCount: 2,
  taggedPiecesCount: 1,
  isFollowing: true,
  featuredBadges: [],
  titleBadge: null,
};

beforeEach(() => {
  serverApiRequest.mockReset();
  getServerAccessToken.mockReset();
});

describe("getCreatorProfileServerPublic", () => {
  it("forwards the viewer's access token so isFollowing is personalized", async () => {
    getServerAccessToken.mockResolvedValue("viewer-token");
    serverApiRequest.mockResolvedValue(creatorProfile);

    const profile = await getCreatorProfileServerPublic("sabin");

    expect(serverApiRequest).toHaveBeenCalledWith("/creators/by-handle/sabin", {
      accessToken: "viewer-token",
    });
    expect(profile?.isFollowing).toBe(true);
  });

  it("requests anonymously when there is no session", async () => {
    getServerAccessToken.mockResolvedValue(null);
    serverApiRequest.mockResolvedValue(creatorProfile);

    await getCreatorProfileServerPublic("sabin");

    expect(serverApiRequest).toHaveBeenCalledWith("/creators/by-handle/sabin", {
      accessToken: undefined,
    });
  });

  it("returns null when the request fails", async () => {
    getServerAccessToken.mockResolvedValue(null);
    serverApiRequest.mockRejectedValue(new Error("not found"));

    const profile = await getCreatorProfileServerPublic("missing-handle");

    expect(profile).toBeNull();
  });
});
