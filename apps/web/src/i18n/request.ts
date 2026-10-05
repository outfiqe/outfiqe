import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, isSupportedLocale, LOCALE_COOKIE_NAME, NEPAL_TIME_ZONE } from "./locales";

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE_NAME)?.value;
  const locale = isSupportedLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return {
    locale,
    timeZone: NEPAL_TIME_ZONE,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
