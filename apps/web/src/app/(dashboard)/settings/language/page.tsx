import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LanguageSettings } from "@/i18n/LanguageSettings";
import { TranslationsProvider } from "@/i18n/TranslationsProvider";

import { requireAuthedSession } from "../../requireDashboardSession";

export const metadata: Metadata = { title: "Language" };

const DashboardLanguageSettingsPage = async () => {
  await requireAuthedSession("/settings/language");
  const t = await getTranslations("language");

  return (
    <TranslationsProvider>
      <div className="max-w-xl">
        <h1 className="font-display text-2xl font-bold text-foreground">{t("settingsTitle")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("settingsDescription")}</p>
        <div className="mt-6">
          <LanguageSettings />
        </div>
      </div>
    </TranslationsProvider>
  );
};

export default DashboardLanguageSettingsPage;
