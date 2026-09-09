import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const serverApiRequest = vi.fn();
vi.mock("@/shared/lib/serverApiClient", () => ({
  serverApiRequest: (...args: unknown[]) => serverApiRequest(...args),
}));

const getServerSessionWithToken = vi.fn();
vi.mock("@/features/auth/api/serverAuth", () => ({
  getServerSessionWithToken: () => getServerSessionWithToken(),
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
  getServerSessionWithToken.mockReset();
});

describe("getBrandsFirstPageServer", () => {
  it("forwards the viewer's access token so isFollowing is personalized", async () => {
    getServerSessionWithToken.mockResolvedValue({ accessToken: "viewer-token", user: {} });
    serverApiRequest.mockResolvedValue(brandPage);

    const page = await getBrandsFirstPageServer();

    expect(serverApiRequest).toHaveBeenCalledWith("/brands", { accessToken: "viewer-token" });
    expect(page.brands[0]?.isFollowing).toBe(true);
  });

  it("requests anonymously when there is no session", async () => {
    getServerSessionWithToken.mockResolvedValue(null);
    serverApiRequest.mockResolvedValue(brandPage);

    await getBrandsFirstPageServer();

    expect(serverApiRequest).toHaveBeenCalledWith("/brands", { accessToken: undefined });
  });

  it("rejects when the response fails schema validation", async () => {
    getServerSessionWithToken.mockResolvedValue(null);
    serverApiRequest.mockResolvedValue({ brands: "not-an-array" });

    await expect(getBrandsFirstPageServer()).rejects.toThrow();
  });
});
