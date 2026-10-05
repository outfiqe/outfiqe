import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  type SupportedLocale,
} from "./locales";

const COOKIE_VALUE_PATTERN = new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]*)`);
const SECURE_PAGE_PROTOCOL = "https:";

const localeChangeListeners = new Set<() => void>();

export const readLocaleCookie = (): SupportedLocale => {
  const cookieValue = COOKIE_VALUE_PATTERN.exec(document.cookie)?.[1];
  return isSupportedLocale(cookieValue) ? cookieValue : DEFAULT_LOCALE;
};

export const subscribeToLocaleChanges = (listener: () => void) => {
  localeChangeListeners.add(listener);
  return () => {
    localeChangeListeners.delete(listener);
  };
};

export const announceLocaleChange = () => {
  localeChangeListeners.forEach((listener) => listener());
};

export const writeLocaleCookie = (locale: SupportedLocale) => {
  const secureAttribute = window.location.protocol === SECURE_PAGE_PROTOCOL ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secureAttribute}`;
  announceLocaleChange();
};
