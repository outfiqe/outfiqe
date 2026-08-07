export const WINSTON_LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
} as const;

export const WINSTON_LOG_LEVEL = process.env.NODE_ENV === "production" ? "info" : "debug";

export const WINSTON_LOG_DATE_PATTERN = "YYYY-MM-DD";

export const WINSTON_MAX_COMBINED_LOG_FILES = "14d";

export const WINSTON_MAX_ERROR_LOG_FILES = "30d";

export const WINSTON_MAX_LOG_FILE_SIZE = "20m";
