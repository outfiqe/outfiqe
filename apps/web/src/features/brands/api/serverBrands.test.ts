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

const { getBrandsFirstPageServer } = await import("./serverBrands");

const brandPage = {
  brands: [
    {
      id: "brand-1",
      name: "Studio One",
      avatarUrl: null,
      bannerUrl: null,
      madeInNepal: true,
      rating: null,
      productCount: 3,
      followerCount: 12,
      isFollowing: true,
      contactUserId: null,
    },
  ],
  nextCursor: null,
  total: 1,
};

beforeEach(() => {
  serverApiRequest.mockReset();
  getServerAccessToken.mockReset();
});

describe("getBrandsFirstPageServer", () => {
  it("forwards the viewer's access token so isFollowing is personalized", async () => {
    getServerAccessToken.mockResolvedValue("viewer-token");
    serverApiRequest.mockResolvedValue(brandPage);

    const page = await getBrandsFirstPageServer();

    expect(serverApiRequest).toHaveBeenCalledWith("/brands", { accessToken: "viewer-token" });
    expect(page.brands[0]?.isFollowing).toBe(true);
  });

  it("requests anonymously when there is no session", async () => {
    getServerAccessToken.mockResolvedValue(null);
    serverApiRequest.mockResolvedValue(brandPage);

    await getBrandsFirstPageServer();

    expect(serverApiRequest).toHaveBeenCalledWith("/brands", { accessToken: undefined });
  });

  it("rejects when the response fails schema validation", async () => {
    getServerAccessToken.mockResolvedValue(null);
    serverApiRequest.mockResolvedValue({ brands: "not-an-array" });

    await expect(getBrandsFirstPageServer()).rejects.toThrow();
  });
});
