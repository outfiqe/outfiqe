"use server";

import { cookies } from "next/headers";

import { isSupportedLocale, LOCALE_COOKIE_MAX_AGE_SECONDS, LOCALE_COOKIE_NAME } from "./locales";

export const setLanguage = async (locale: string): Promise<void> => {
  if (!isSupportedLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
  });
};
