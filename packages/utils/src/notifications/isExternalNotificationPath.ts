const EXTERNAL_URL_PATTERN = /^https?:\/\//;

export const isExternalNotificationPath = (path: string | null | undefined): boolean =>
  Boolean(path && EXTERNAL_URL_PATTERN.test(path));
