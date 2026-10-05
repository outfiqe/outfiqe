"use client";

import { useSyncExternalStore } from "react";

import { readLocaleCookie, subscribeToLocaleChanges, writeLocaleCookie } from "./localeCookie";
import type { SupportedLocale } from "./locales";

const readLocaleOnServer = (): SupportedLocale | null => null;

export const useChosenLanguage = () => {
  const chosenLocale = useSyncExternalStore(
    subscribeToLocaleChanges,
    readLocaleCookie,
    readLocaleOnServer,
  );

  return { chosenLocale, chooseLanguage: writeLocaleCookie };
};

export const useActiveLocale = (localeOnServer: SupportedLocale): SupportedLocale =>
  useSyncExternalStore(subscribeToLocaleChanges, readLocaleCookie, () => localeOnServer);
