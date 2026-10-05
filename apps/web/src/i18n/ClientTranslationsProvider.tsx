"use client";

import { NextIntlClientProvider } from "next-intl";
import { useSyncExternalStore } from "react";

import { readLocaleCookie, subscribeToLocaleChanges } from "./localeCookie";
import { DEFAULT_LOCALE, NEPAL_TIME_ZONE } from "./locales";
import englishMessages from "./messages/en.json";
import nepaliMessages from "./messages/ne.json";

const MESSAGES_BY_LOCALE = { en: englishMessages, ne: nepaliMessages } as const;

const readDefaultLocale = () => DEFAULT_LOCALE;

export const ClientTranslationsProvider = ({ children }: { children: React.ReactNode }) => {
  const locale = useSyncExternalStore(
    subscribeToLocaleChanges,
    readLocaleCookie,
    readDefaultLocale,
  );

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={MESSAGES_BY_LOCALE[locale]}
      timeZone={NEPAL_TIME_ZONE}
    >
      {children}
    </NextIntlClientProvider>
  );
};
