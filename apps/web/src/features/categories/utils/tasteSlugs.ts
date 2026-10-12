export const TASTE_CATEGORIES_STORAGE_KEY = "outfiqe:taste-categories";
export const TASTE_CATEGORIES_COOKIE_NAME = "outfiqe_taste_categories";
export const TASTE_CATEGORIES_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const TASTE_PREFERENCES_QUERY_KEY = ["taste-preferences", "me"] as const;

export const parseTasteSlugs = (raw: string | null | undefined): string[] | null => {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((slug) => typeof slug === "string")) return parsed;
  } catch {
    return null;
  }
  return null;
};

export const serializeTasteSlugs = (slugs: string[]): string => JSON.stringify(slugs);

export const parseTasteCookie = (rawCookieValue: string | null | undefined): string[] | null => {
  if (!rawCookieValue) return null;
  try {
    return parseTasteSlugs(decodeURIComponent(rawCookieValue));
  } catch {
    return null;
  }
};
