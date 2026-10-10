import { TRENDING_RANKS, type TrendingRank } from "@/shared/components/TrendingRankBadge";

import type { FeedPost } from "../api/exploreFeedSchemas";

export const buildTrendingRankByPostId = (
  posts: FeedPost[],
  isRankedTab: boolean,
): Map<string, TrendingRank> => {
  const trendingRankByPostId = new Map<string, TrendingRank>();
  if (!isRankedTab) return trendingRankByPostId;

  let trendingOrdinal = 0;
  for (const post of posts) {
    if (!post.isTrending) continue;
    const rank = TRENDING_RANKS[trendingOrdinal];
    if (!rank) break;
    trendingRankByPostId.set(post.id, rank);
    trendingOrdinal += 1;
  }
  return trendingRankByPostId;
};

export const findTrendingFallbackBoundary = (posts: FeedPost[], isRankedTab: boolean): number => {
  if (!isRankedTab) return -1;
  return posts.findIndex((post) => !post.isTrending);
};
