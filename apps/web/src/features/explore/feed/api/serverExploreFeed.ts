import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { type FeedPage, feedPageSchema } from "./exploreFeedSchemas";

const FEED_FIRST_PAGE_CACHE_SECONDS = 30;

export const getExploreFeedFirstPageServer = async (tab: string): Promise<FeedPage> => {
  const raw = await serverApiRequest<FeedPage>(
    `/creator-looks/feed?tab=${encodeURIComponent(tab)}`,
    { revalidateSeconds: FEED_FIRST_PAGE_CACHE_SECONDS },
  );
  return feedPageSchema.parse(raw);
};
