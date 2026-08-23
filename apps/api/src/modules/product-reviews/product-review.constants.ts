export const REVIEW_TITLE_MAX = 100;
export const REVIEW_BODY_MIN = 10;
export const REVIEW_BODY_MAX = 2000;
export const MAX_REVIEW_IMAGES = 5;

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

export const REVIEW_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const REVIEW_RATE_LIMIT_MAX_REQUESTS = 10;

export const HELPFUL_VOTE_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const HELPFUL_VOTE_RATE_LIMIT_MAX_REQUESTS = 30;

export const REVIEW_SORT_VALUES = [
  "newest",
  "oldest",
  "highest_rating",
  "lowest_rating",
  "most_helpful",
] as const;
