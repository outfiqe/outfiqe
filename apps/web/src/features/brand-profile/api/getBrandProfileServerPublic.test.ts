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

const { getBrandProfileServerPublic } = await import("./getBrandProfileServerPublic");

const brandProfile = {
  id: "brand-1",
  name: "Studio One",
  avatarUrl: null,
  avatarImage: null,
  bannerUrl: null,
  bannerImage: null,
  madeInNepal: true,
  rating: null,
  productCount: 3,
  followerCount: 12,
  isFollowing: true,
  contactUserId: null,
};

beforeEach(() => {
  serverApiRequest.mockReset();
  getServerAccessToken.mockReset();
});

describe("getBrandProfileServerPublic", () => {
  it("forwards the viewer's access token so isFollowing is personalized", async () => {
    getServerAccessToken.mockResolvedValue("viewer-token");
    serverApiRequest.mockResolvedValue(brandProfile);

    const profile = await getBrandProfileServerPublic("brand-1");

    expect(serverApiRequest).toHaveBeenCalledWith("/brands/brand-1", {
      accessToken: "viewer-token",
    });
    expect(profile?.isFollowing).toBe(true);
  });

  it("requests anonymously when there is no session", async () => {
    getServerAccessToken.mockResolvedValue(null);
    serverApiRequest.mockResolvedValue(brandProfile);

    await getBrandProfileServerPublic("brand-1");

    expect(serverApiRequest).toHaveBeenCalledWith("/brands/brand-1", { accessToken: undefined });
  });

  it("returns null when the request fails", async () => {
    getServerAccessToken.mockResolvedValue(null);
    serverApiRequest.mockRejectedValue(new Error("not found"));

    const profile = await getBrandProfileServerPublic("missing-brand");

    expect(profile).toBeNull();
  });
});
