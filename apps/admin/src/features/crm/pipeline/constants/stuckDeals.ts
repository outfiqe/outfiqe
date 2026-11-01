export const STUCK_DEAL_DAYS = 14;
export const STUCK_FILTER_VALUE = "yes";

const MILLISECONDS_PER_DAY = 86_400_000;

export const toStuckBefore = (now = new Date()): string =>
  new Date(now.getTime() - STUCK_DEAL_DAYS * MILLISECONDS_PER_DAY).toISOString();
