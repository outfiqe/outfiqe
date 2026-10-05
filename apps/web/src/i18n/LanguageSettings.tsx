"use client";

import { RadioGroup } from "@outfiqe/design-system";
import { useTranslations } from "next-intl";

import { useChosenLanguage } from "./LanguageSwitch";
import type { SupportedLocale } from "./locales";

export const LanguageSettings = () => {
  const t = useTranslations("language");
  const { chosenLocale, chooseLanguage, isSwitching } = useChosenLanguage();

  return (
    <RadioGroup<SupportedLocale>
      legend={t("label")}
      value={chosenLocale}
      onChange={chooseLanguage}
      disabled={isSwitching}
      options={[
        { value: "en", label: t("englishName"), lang: "en" },
        { value: "ne", label: t("nepaliName"), lang: "ne" },
      ]}
    />
  );
};
