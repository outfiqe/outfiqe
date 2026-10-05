"use client";

import { NextIntlClientProvider } from "next-intl";

import { DEFAULT_LOCALE, NEPAL_TIME_ZONE, type SupportedLocale } from "./locales";
import englishMessages from "./messages/en.json";
import nepaliMessages from "./messages/ne.json";
import { useActiveLocale } from "./useChosenLanguage";

const MESSAGES_BY_LOCALE = { en: englishMessages, ne: nepaliMessages } as const;

type ClientTranslationsProviderProps = {
  children: React.ReactNode;
  localeOnServer?: SupportedLocale;
  marksLanguage?: boolean;
};

export const ClientTranslationsProvider = ({
  children,
  localeOnServer = DEFAULT_LOCALE,
  marksLanguage = false,
}: ClientTranslationsProviderProps) => {
  const locale = useActiveLocale(localeOnServer);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={MESSAGES_BY_LOCALE[locale]}
      timeZone={NEPAL_TIME_ZONE}
    >
      {marksLanguage ? <div lang={locale}>{children}</div> : children}
    </NextIntlClientProvider>
  );
};
