export type QueueDepthCounts = {
  waiting: number;
  active: number;
  delayed: number;
};

export type BackPressureDecision =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };

export const totalQueueDepth = (counts: QueueDepthCounts): number =>
  counts.waiting + counts.active + counts.delayed;

export const checkBackPressure = (
  counts: QueueDepthCounts,
  maxQueueDepth: number,
  retryAfterSeconds: number,
): BackPressureDecision => {
  if (totalQueueDepth(counts) >= maxQueueDepth) {
    return { allowed: false, retryAfterSeconds };
  }
  return { allowed: true };
};
