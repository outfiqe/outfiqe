export const STREAM_MAX_LEN = 10_000;

export const CONSUMER_BLOCK_MS = 5_000;
export const CONSUMER_BATCH_SIZE = 10;

// Determines how long a delivered-but-unacked message waits before XAUTOCLAIM treats it as stuck and retries it.
export const CLAIM_IDLE_MS = 30_000;
export const MAX_DELIVERY_ATTEMPTS = 5;

export const DEAD_LETTER_SUFFIX = ":dead-letter";
