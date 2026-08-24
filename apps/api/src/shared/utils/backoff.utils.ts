const BACKOFF_BASE_DELAY_MS = 200;
const BACKOFF_MAX_DELAY_MS = 10_000;
const BACKOFF_JITTER_RATIO = 0.2;

export const computeBackoffDelayMs = (attempt: number): number => {
  const exponentialDelayMs = Math.min(BACKOFF_BASE_DELAY_MS * 2 ** attempt, BACKOFF_MAX_DELAY_MS);
  const jitterMs = Math.random() * exponentialDelayMs * BACKOFF_JITTER_RATIO;
  return exponentialDelayMs + jitterMs;
};

export const waitMs = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
