export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const XP_SOURCE = {
  CREATOR_LOOKS: "creator-looks",
  FOLLOWS: "follows",
  PAYMENTS: "payments",
  COMMISSIONS: "commissions",
  ADMIN: "admin",
} as const;

export const MIN_XP_MULTIPLIER = 1;
export const MAX_XP_MULTIPLIER = 10;

export const USER_PROGRESS_TOTAL_XP_FLOOR_CONSTRAINT = "user_progress_total_xp_floor_check";
