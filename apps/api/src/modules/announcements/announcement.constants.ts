export const ANNOUNCEMENT_SEND_NOW_MAX_RECIPIENTS = 500;
export const ANNOUNCEMENT_FANOUT_PAGE_SIZE = 500;
export const ANNOUNCEMENT_SCHEDULE_SWEEP_INTERVAL_MS = 60 * 1000;

export const ANNOUNCEMENT_TITLE_MAX_LENGTH = 120;
export const ANNOUNCEMENT_BODY_MAX_LENGTH = 2000;
export const ANNOUNCEMENT_TARGET_PATH_MAX_LENGTH = 2048;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export const ANNOUNCEMENT_AUDIT_ACTION = {
  SCHEDULED: "announcement.scheduled",
  SENT: "announcement.sent",
  CANCELED: "announcement.canceled",
} as const;

export const ANNOUNCEMENT_AUDIT_TARGET_TYPE = "announcement";
