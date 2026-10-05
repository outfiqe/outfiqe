import { QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

import englishMessages from "@/i18n/messages/en.json";

import { createTestQueryClient } from "./queryClientWrapper";

const TEST_TIME_ZONE = "Asia/Kathmandu";

export const createTranslatedQueryWrapper = () => {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={englishMessages} timeZone={TEST_TIME_ZONE}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
  Wrapper.displayName = "TranslatedQueryTestWrapper";

  return { Wrapper, queryClient };
};
