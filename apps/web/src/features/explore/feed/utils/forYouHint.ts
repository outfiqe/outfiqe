export const FOR_YOU_HINT_DISMISSED_COOKIE_NAME = "outfiqe-for-you-hint-dismissed";
export const LEGACY_FOR_YOU_HINT_DISMISSED_STORAGE_KEY = "outfiqe-for-you-hint-dismissed";
export const FOR_YOU_HINT_DISMISSED_VALUE = "1";

const FOR_YOU_HINT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const SECURE_PAGE_PROTOCOL = "https:";
const DISMISSED_COOKIE_PATTERN = new RegExp(
  `(?:^|; )${FOR_YOU_HINT_DISMISSED_COOKIE_NAME}=${FOR_YOU_HINT_DISMISSED_VALUE}(?:;|$)`,
);

const ignoreBlockedStorage = () => undefined;

const hasDismissedCookie = (): boolean => DISMISSED_COOKIE_PATTERN.test(document.cookie);

const hasLegacyStoredDismissal = (): boolean => {
  try {
    return (
      localStorage.getItem(LEGACY_FOR_YOU_HINT_DISMISSED_STORAGE_KEY) ===
      FOR_YOU_HINT_DISMISSED_VALUE
    );
  } catch {
    return false;
  }
};

export const isForYouHintDismissed = (): boolean =>
  hasDismissedCookie() || hasLegacyStoredDismissal();

export const isForYouHintDismissedCookieValue = (cookieValue: string | undefined): boolean =>
  cookieValue === FOR_YOU_HINT_DISMISSED_VALUE;

export const rememberForYouHintDismissed = (): void => {
  const secureAttribute = window.location.protocol === SECURE_PAGE_PROTOCOL ? "; Secure" : "";
  document.cookie = `${FOR_YOU_HINT_DISMISSED_COOKIE_NAME}=${FOR_YOU_HINT_DISMISSED_VALUE}; Path=/; Max-Age=${FOR_YOU_HINT_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secureAttribute}`;
};

export const carryOverLegacyForYouHintDismissal = (): void => {
  if (hasDismissedCookie() || !hasLegacyStoredDismissal()) return;
  rememberForYouHintDismissed();
  try {
    localStorage.removeItem(LEGACY_FOR_YOU_HINT_DISMISSED_STORAGE_KEY);
  } catch {
    ignoreBlockedStorage();
  }
};
