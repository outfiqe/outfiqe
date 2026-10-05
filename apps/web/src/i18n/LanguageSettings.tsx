"use client";

import { RadioGroup } from "@outfiqe/design-system";
import { useTranslations } from "next-intl";

import { DEFAULT_LOCALE, type SupportedLocale } from "./locales";
import { useChosenLanguage } from "./useChosenLanguage";

export const LanguageSettings = () => {
  const t = useTranslations("language");
  const { chosenLocale, chooseLanguage } = useChosenLanguage();

  return (
    <RadioGroup<SupportedLocale>
      legend={t("label")}
      value={chosenLocale ?? DEFAULT_LOCALE}
      onChange={chooseLanguage}
      options={[
        { value: "en", label: t("englishName"), lang: "en" },
        { value: "ne", label: t("nepaliName"), lang: "ne" },
      ]}
    />
  );
};
