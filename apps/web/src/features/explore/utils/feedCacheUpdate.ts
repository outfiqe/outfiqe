import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import type { FeedPage, FeedPost } from "../api/exploreFeedSchemas";

const FEED_QUERY_KEY_ROOTS = [["explore-feed"], ["saved-posts"]];

export const patchPostInFeedCaches = (
  queryClient: QueryClient,
  lookId: string,
  patch: (post: FeedPost) => FeedPost,
): void => {
  FEED_QUERY_KEY_ROOTS.forEach((queryKey) => {
    queryClient.setQueriesData<InfiniteData<FeedPage>>({ queryKey }, (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          posts: page.posts.map((post) => (post.id === lookId ? patch(post) : post)),
        })),
      };
    });
  });
};

export const patchCreatorInFeedCaches = (
  queryClient: QueryClient,
  creatorId: string,
  isFollowingCreator: boolean,
): void => {
  queryClient.setQueriesData<InfiniteData<FeedPage>>({ queryKey: ["explore-feed"] }, (data) => {
    if (!data) return data;
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        posts: page.posts.map((post) =>
          post.creator.id === creatorId ? { ...post, isFollowingCreator } : post,
        ),
      })),
    };
  });
};
