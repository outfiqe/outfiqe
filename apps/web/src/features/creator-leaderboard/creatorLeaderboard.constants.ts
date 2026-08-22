export const CREATOR_LEADERBOARD_QUERY_PARAM = "category";

export const CREATOR_LEADERBOARD_CATEGORY = {
  TOP_XP: "TOP_XP",
  TOP_CREATOR: "TOP_CREATOR",
  MOST_LIKES: "MOST_LIKES",
  MOST_ENGAGED: "MOST_ENGAGED",
  TOP_SELLER: "TOP_SELLER",
  RISING_CREATOR: "RISING_CREATOR",
  MOST_ACHIEVEMENTS: "MOST_ACHIEVEMENTS",
} as const;

export type CreatorLeaderboardCategory =
  (typeof CREATOR_LEADERBOARD_CATEGORY)[keyof typeof CREATOR_LEADERBOARD_CATEGORY];

export const CREATOR_LEADERBOARD_CATEGORY_LABEL: Record<CreatorLeaderboardCategory, string> = {
  TOP_XP: "Top XP",
  TOP_CREATOR: "Top Creator",
  MOST_LIKES: "Most Likes",
  MOST_ENGAGED: "Most Engaged",
  TOP_SELLER: "Top Seller",
  RISING_CREATOR: "Rising Creator",
  MOST_ACHIEVEMENTS: "Most Achievements",
};

const CREATOR_LEADERBOARD_CATEGORIES: readonly CreatorLeaderboardCategory[] = Object.values(
  CREATOR_LEADERBOARD_CATEGORY,
);

export const isCreatorLeaderboardCategory = (value: string): value is CreatorLeaderboardCategory =>
  CREATOR_LEADERBOARD_CATEGORIES.some((category) => category === value);

export const CREATOR_LEADERBOARD_SOCKET_EVENTS = {
  UPDATED: "creator-leaderboard:updated",
  SUBSCRIBE: "creator-leaderboard:subscribe",
  UNSUBSCRIBE: "creator-leaderboard:unsubscribe",
} as const;
