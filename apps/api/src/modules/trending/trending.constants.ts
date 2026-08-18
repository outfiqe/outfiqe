export const AGGREGATION_INTERVAL_MS = 15 * 60 * 1000;
export const SCORING_INTERVAL_MS = 30 * 60 * 1000;

export const METRIC_RETENTION_DAYS = 14;
export const BASELINE_WINDOW_DAYS = 14;
export const RECENT_METRICS_WINDOW_DAYS = 7;
export const RECENT_METRICS_WINDOW_HOURS = RECENT_METRICS_WINDOW_DAYS * 24;
export const MIN_BUCKETS_FOR_OWN_BASELINE = 4;
export const BASELINE_WINDOW_HOURS = 6;

export const CURRENT_WINDOW_START_HOURS = 0;
export const CURRENT_WINDOW_END_HOURS = 6;
export const PREVIOUS_WINDOW_START_HOURS = 6;
export const PREVIOUS_WINDOW_END_HOURS = 12;

export const SIGNAL_WEIGHTS = {
  purchaseUnits: 5.0,
  cartAdds: 3.0,
  saves: 3.0,
  creatorTags: 3.0,
  tagClicks: 1.5,
} as const;

export const DECAY_HALF_LIFE_HOURS = 20;
export const SMOOTHING = 2;
export const MOMENTUM_CAP = 8;

export const FRESHNESS_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
export const FRESHNESS_MULTIPLIER = 1.15;

export const CANDIDATE_POOL_SIZE = 50;
export const DIVERSE_POOL_LIMIT = 30;
export const MAX_PER_BRAND = 2;
export const ROTATION_TIE_BAND = 0.1;
