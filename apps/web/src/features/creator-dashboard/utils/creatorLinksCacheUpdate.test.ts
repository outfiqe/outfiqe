import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type { CreatorLink, CreatorLinkPage } from "../api/creatorLinksSchemas";
import { CreatorLinkStatus, CreatorLinkType } from "../api/creatorLinksSchemas";
import { CREATOR_LINKS_QUERY_KEY, prependCreatorLinkToCache } from "./creatorLinksCacheUpdate";

const buildLink = (id: string): CreatorLink => ({
  id,
  token: `token-${id}`,
  shareUrl: `https://outfiqe.test/r/${id}`,
  type: CreatorLinkType.EXTERNAL_REUSABLE,
  status: CreatorLinkStatus.ACTIVE,
  productId: "product-1",
  productName: "Denim Jacket",
  clickCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const buildPage = (items: CreatorLink[], nextCursor: string | null = null): CreatorLinkPage => ({
  items,
  nextCursor,
});

describe("prependCreatorLinkToCache", () => {
  it("prepends the new link to the first page of a matching cached query", () => {
    const queryClient = new QueryClient();
    const existing = buildLink("existing");
    queryClient.setQueryData(CREATOR_LINKS_QUERY_KEY, {
      pages: [buildPage([existing])],
      pageParams: [undefined],
    });

    const newLink = buildLink("new");
    prependCreatorLinkToCache(queryClient, newLink);

    const cached = queryClient.getQueryData<{ pages: CreatorLinkPage[] }>(CREATOR_LINKS_QUERY_KEY);
    expect(cached?.pages[0]?.items.map((item) => item.id)).toEqual(["new", "existing"]);
  });

  it("leaves later pages untouched", () => {
    const queryClient = new QueryClient();
    const firstPageItem = buildLink("first-page-item");
    const secondPageItem = buildLink("second-page-item");
    queryClient.setQueryData(CREATOR_LINKS_QUERY_KEY, {
      pages: [buildPage([firstPageItem], "cursor-1"), buildPage([secondPageItem])],
      pageParams: [undefined, "cursor-1"],
    });

    prependCreatorLinkToCache(queryClient, buildLink("new"));

    const cached = queryClient.getQueryData<{ pages: CreatorLinkPage[] }>(CREATOR_LINKS_QUERY_KEY);
    expect(cached?.pages[1]?.items).toEqual([secondPageItem]);
  });

  it("does nothing when there's no cached data for the query yet", () => {
    const queryClient = new QueryClient();

    expect(() => prependCreatorLinkToCache(queryClient, buildLink("new"))).not.toThrow();
    expect(queryClient.getQueryData(CREATOR_LINKS_QUERY_KEY)).toBeUndefined();
  });

  it("doesn't duplicate a link that's already present in the first page", () => {
    const queryClient = new QueryClient();
    const link = buildLink("already-there");
    queryClient.setQueryData(CREATOR_LINKS_QUERY_KEY, {
      pages: [buildPage([link])],
      pageParams: [undefined],
    });

    prependCreatorLinkToCache(queryClient, link);

    const cached = queryClient.getQueryData<{ pages: CreatorLinkPage[] }>(CREATOR_LINKS_QUERY_KEY);
    expect(cached?.pages[0]?.items).toHaveLength(1);
  });
});
