import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import type { CreatorLink, CreatorLinkPage } from "../api/creatorLinksSchemas";

export const CREATOR_LINKS_QUERY_KEY = ["creator-links", "mine"];

export const prependCreatorLinkToCache = (queryClient: QueryClient, link: CreatorLink): void => {
  queryClient.setQueriesData<InfiniteData<CreatorLinkPage, string | undefined>>(
    { queryKey: CREATOR_LINKS_QUERY_KEY },
    (data) => {
      if (!data) return data;

      const [firstPage, ...restPages] = data.pages;
      if (!firstPage || firstPage.items.some((item) => item.id === link.id)) return data;

      return {
        ...data,
        pages: [{ ...firstPage, items: [link, ...firstPage.items] }, ...restPages],
      };
    },
  );
};
