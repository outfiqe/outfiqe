export const TRENDING_AGGREGATION_INTERVAL_MS = 15 * 60 * 1000;
export const TRENDING_SCORING_INTERVAL_MS = 30 * 60 * 1000;

export const TREND_METRIC_RETENTION_DAYS = 14;
export const TREND_BASELINE_WINDOW_DAYS = 14;
export const TREND_RECENT_METRICS_WINDOW_DAYS = 7;
export const TREND_RECENT_METRICS_WINDOW_HOURS = TREND_RECENT_METRICS_WINDOW_DAYS * 24;
export const TREND_MIN_BUCKETS_FOR_OWN_BASELINE = 4;
export const TREND_BASELINE_WINDOW_HOURS = 6;

export const TREND_CURRENT_WINDOW_START_HOURS = 0;
export const TREND_CURRENT_WINDOW_END_HOURS = 6;
export const TREND_PREVIOUS_WINDOW_START_HOURS = 6;
export const TREND_PREVIOUS_WINDOW_END_HOURS = 12;

export const TREND_SIGNAL_WEIGHTS = {
  likes: 1.5,
  comments: 3.0,
  saves: 3.0,
  tagClicks: 2.0,
} as const;

export const TREND_DECAY_HALF_LIFE_HOURS = 20;
export const TREND_SMOOTHING = 2;
export const TREND_MOMENTUM_CAP = 8;

export const TREND_FRESHNESS_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
export const TREND_FRESHNESS_MULTIPLIER = 1.15;

export const FOR_YOU_ENGAGEMENT_LOOKBACK_DAYS = 60;
export const FOR_YOU_FOLLOW_BOOST = 0.6;
export const FOR_YOU_ENGAGED_CREATOR_BOOST = 0.3;
export const FOR_YOU_HASHTAG_BOOST_PER_MATCH = 0.1;
export const FOR_YOU_HASHTAG_MATCH_WEIGHT_CAP = 5;
export const FOR_YOU_HASHTAG_BOOST_CAP = 0.4;
export const FOR_YOU_MAX_PER_CREATOR = 3;

export const TAG_TREND_AGGREGATION_INTERVAL_MS = 15 * 60 * 1000;
export const TAG_TREND_SCORING_INTERVAL_MS = 30 * 60 * 1000;

export const TAG_TREND_METRIC_RETENTION_DAYS = 14;
export const TAG_TREND_BASELINE_WINDOW_DAYS = 14;
export const TAG_TREND_RECENT_METRICS_WINDOW_DAYS = 7;
export const TAG_TREND_RECENT_METRICS_WINDOW_HOURS = TAG_TREND_RECENT_METRICS_WINDOW_DAYS * 24;
export const TAG_TREND_MIN_BUCKETS_FOR_OWN_BASELINE = 4;
export const TAG_TREND_BASELINE_WINDOW_HOURS = 6;

export const TAG_TREND_CURRENT_WINDOW_START_HOURS = 0;
export const TAG_TREND_CURRENT_WINDOW_END_HOURS = 6;
export const TAG_TREND_PREVIOUS_WINDOW_START_HOURS = 6;
export const TAG_TREND_PREVIOUS_WINDOW_END_HOURS = 12;

export const TAG_TREND_SIGNAL_WEIGHT = 1;
export const TAG_TREND_DECAY_HALF_LIFE_HOURS = 20;
export const TAG_TREND_SMOOTHING = 2;
export const TAG_TREND_MOMENTUM_CAP = 8;

export const TAG_TRENDING_LIMIT = 15;

export const AUTOCOMPLETE_LIMIT = 4;

export const BOT_USER_AGENT_PATTERNS = [
  "bot",
  "spider",
  "crawler",
  "crawl",
  "slurp",
  "curl",
  "wget",
  "python-requests",
  "python-urllib",
  "axios",
  "node-fetch",
  "headlesschrome",
  "phantomjs",
  "facebookexternalhit",
  "whatsapp",
  "telegrambot",
  "discordbot",
] as const;

export const VIEW_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const VIEW_RATE_LIMIT_MAX_REQUESTS = 60;

export const COMMENT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const COMMENT_RATE_LIMIT_MAX_REQUESTS = 20;

export const COMMENT_REPLY_PREVIEW_COUNT = 2;
