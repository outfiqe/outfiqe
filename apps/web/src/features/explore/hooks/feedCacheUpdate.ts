import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import type { FeedPage, FeedPost } from "../api/exploreFeedSchemas";

// A post can be cached under several tabs at once (for_you and trending currently return the
// same ranking, a hashtag tab might overlap with both). Patch every cached feed page that has
// this post, wherever it lives, rather than just the tab the click happened on.
export const patchPostInFeedCaches = (
  queryClient: QueryClient,
  lookId: string,
  patch: (post: FeedPost) => FeedPost,
): void => {
  queryClient.setQueriesData<InfiniteData<FeedPage>>({ queryKey: ["explore-feed"] }, (data) => {
    if (!data) return data;
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        posts: page.posts.map((post) => (post.id === lookId ? patch(post) : post)),
      })),
    };
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
