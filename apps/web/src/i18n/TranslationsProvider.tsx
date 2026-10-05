import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTimeZone } from "next-intl/server";

export const TranslationsProvider = async ({ children }: { children: React.ReactNode }) => {
  const [locale, messages, timeZone] = await Promise.all([
    getLocale(),
    getMessages(),
    getTimeZone(),
  ]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <div lang={locale}>{children}</div>
    </NextIntlClientProvider>
  );
};
