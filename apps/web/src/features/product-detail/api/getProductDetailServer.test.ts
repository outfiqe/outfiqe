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

const { getProductDetailServer } = await import("./getProductDetailServer");

const rawProduct = {
  id: "product-1",
  brand: { id: "brand-1", name: "Studio One" },
  name: "Everyday Tee",
  price: 1500,
  effectivePrice: 1500,
  discountPercent: null,
  type: "tops",
  categorySlugs: [],
  imageUrl: null,
  image: null,
  lowStock: false,
  isNew: false,
  sizes: [],
  images: [],
  wornByCount: 0,
  seenOnCreators: [],
  isSaved: true,
  avgRating: null,
  reviewCount: 0,
  rating1Count: 0,
  rating2Count: 0,
  rating3Count: 0,
  rating4Count: 0,
  rating5Count: 0,
};

beforeEach(() => {
  serverApiRequest.mockReset();
  getServerAccessToken.mockReset();
});

describe("getProductDetailServer", () => {
  it("forwards the viewer's access token so isSaved is personalized", async () => {
    getServerAccessToken.mockResolvedValue("viewer-token");
    serverApiRequest.mockResolvedValue(rawProduct);

    const product = await getProductDetailServer("product-1");

    expect(serverApiRequest).toHaveBeenCalledWith("/products/product-1", {
      accessToken: "viewer-token",
    });
    expect(product?.isSaved).toBe(true);
  });

  it("requests anonymously when there is no session", async () => {
    getServerAccessToken.mockResolvedValue(null);
    serverApiRequest.mockResolvedValue(rawProduct);

    await getProductDetailServer("product-1");

    expect(serverApiRequest).toHaveBeenCalledWith("/products/product-1", {
      accessToken: undefined,
    });
  });

  it("returns null when the request fails", async () => {
    getServerAccessToken.mockResolvedValue(null);
    serverApiRequest.mockRejectedValue(new Error("not found"));

    const product = await getProductDetailServer("missing-product");

    expect(product).toBeNull();
  });
});
