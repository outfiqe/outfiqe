import { getLocale } from "next-intl/server";

import { ClientTranslationsProvider } from "./ClientTranslationsProvider";
import { DEFAULT_LOCALE, isSupportedLocale } from "./locales";

export const TranslationsProvider = async ({ children }: { children: React.ReactNode }) => {
  const requestLocale = await getLocale();
  const localeOnServer = isSupportedLocale(requestLocale) ? requestLocale : DEFAULT_LOCALE;

  return (
    <ClientTranslationsProvider localeOnServer={localeOnServer} marksLanguage>
      {children}
    </ClientTranslationsProvider>
  );
};
