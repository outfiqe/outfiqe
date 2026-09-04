import { mswServer } from "@test/integration/msw/server";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { brandProfileApi } from "./brandProfileApi";

const brand = {
  id: "brand-1",
  name: "Kastha Studio",
  avatarUrl: null,
  bannerUrl: null,
  madeInNepal: true,
  rating: 4.5,
  productCount: 12,
  followerCount: 340,
  isFollowing: false,
  contactUserId: null,
};

const emptyPage = { products: [], nextCursor: null, total: 0, brandCount: 1 };
const ok = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

describe("brandProfileApi", () => {
  it("fetches and validates a brand profile", async () => {
    mswServer.use(http.get("/api/brands/brand-1", () => ok(brand)));

    expect(await brandProfileApi.get("brand-1")).toMatchObject({
      id: "brand-1",
      madeInNepal: true,
    });
  });

  it("lists products with no query string when neither cursor nor type is given", async () => {
    let requestUrl: URL | undefined;
    mswServer.use(
      http.get("/api/brands/brand-1/products", ({ request }) => {
        requestUrl = new URL(request.url);
        return ok(emptyPage);
      }),
    );

    await brandProfileApi.listProducts("brand-1");

    expect([...(requestUrl?.searchParams.keys() ?? [])]).toEqual([]);
  });

  it("passes the cursor and type filter through as query params", async () => {
    let requestUrl: URL | undefined;
    mswServer.use(
      http.get("/api/brands/brand-1/products", ({ request }) => {
        requestUrl = new URL(request.url);
        return ok(emptyPage);
      }),
    );

    await brandProfileApi.listProducts("brand-1", "cursor-2", "tops");

    expect(requestUrl?.searchParams.get("cursor")).toBe("cursor-2");
    expect(requestUrl?.searchParams.get("type")).toBe("tops");
  });
});
