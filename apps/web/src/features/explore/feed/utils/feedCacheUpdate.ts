import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import type { FeedPage, FeedPost } from "../api/exploreFeedSchemas";

// Every React Query cache root that can hold FeedPost data. An optimistic
// like / save / follow patch has to reach the post wherever it is rendered,
// not just the explore feed: the saved grid, a creator profile's look grid
// (["creator-looks", handle]), look search results, and a single deep-linked
// look (usePublicLook's ["creator-looks", "public", lookId]).
export const FEED_POST_QUERY_ROOTS: readonly (readonly string[])[] = [
  ["explore-feed"],
  ["saved-posts"],
  ["creator-looks"],
  ["look-search"],
];

type FeedPageInfiniteData = InfiniteData<FeedPage>;

const isFeedPageInfiniteData = (data: unknown): data is FeedPageInfiniteData =>
  typeof data === "object" &&
  data !== null &&
  Array.isArray((data as FeedPageInfiniteData).pages) &&
  (data as FeedPageInfiniteData).pages.every(
    (page) => typeof page === "object" && page !== null && Array.isArray((page as FeedPage).posts),
  );

const isFeedPost = (data: unknown): data is FeedPost =>
  typeof data === "object" &&
  data !== null &&
  typeof (data as FeedPost).id === "string" &&
  typeof (data as FeedPost).isLiked === "boolean" &&
  typeof (data as FeedPost).creator === "object";

const feedPostUpdater =
  (matchesPost: (post: FeedPost) => boolean, patch: (post: FeedPost) => FeedPost) =>
  (data: unknown): unknown => {
    if (isFeedPageInfiniteData(data)) {
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          posts: page.posts.map((post) => (matchesPost(post) ? patch(post) : post)),
        })),
      };
    }
    if (isFeedPost(data) && matchesPost(data)) {
      return patch(data);
    }
    return data;
  };

const patchEveryFeedPostCache = (
  queryClient: QueryClient,
  matchesPost: (post: FeedPost) => boolean,
  patch: (post: FeedPost) => FeedPost,
): void => {
  const updater = feedPostUpdater(matchesPost, patch);
  FEED_POST_QUERY_ROOTS.forEach((queryKey) => {
    queryClient.setQueriesData({ queryKey }, updater);
  });
};

export const cancelFeedPostQueries = (queryClient: QueryClient): Promise<void[]> =>
  Promise.all(FEED_POST_QUERY_ROOTS.map((queryKey) => queryClient.cancelQueries({ queryKey })));

export const patchPostInFeedCaches = (
  queryClient: QueryClient,
  lookId: string,
  patch: (post: FeedPost) => FeedPost,
): void => {
  patchEveryFeedPostCache(queryClient, (post) => post.id === lookId, patch);
};

export const patchCreatorInFeedCaches = (
  queryClient: QueryClient,
  creatorId: string,
  isFollowingCreator: boolean,
): void => {
  patchEveryFeedPostCache(
    queryClient,
    (post) => post.creator.id === creatorId,
    (post) => ({ ...post, isFollowingCreator }),
  );
};
