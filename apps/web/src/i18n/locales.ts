export const SUPPORTED_LOCALES = ["en", "ne"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const NEPAL_TIME_ZONE = "Asia/Kathmandu";

export const isSupportedLocale = (value: string | undefined): value is SupportedLocale =>
  SUPPORTED_LOCALES.some((locale) => locale === value);
