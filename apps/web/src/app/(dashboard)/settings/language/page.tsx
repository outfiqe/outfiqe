import type { Metadata } from "next";

import { LanguageSettings } from "@/i18n/LanguageSettings";
import { TranslatedPageHeading } from "@/i18n/TranslatedPageHeading";
import { TranslationsProvider } from "@/i18n/TranslationsProvider";

import { requireAuthedSession } from "../../requireDashboardSession";

export const metadata: Metadata = { title: "Language" };

const DashboardLanguageSettingsPage = async () => {
  await requireAuthedSession("/settings/language");

  return (
    <TranslationsProvider>
      <div className="max-w-xl">
        <TranslatedPageHeading
          namespace="language"
          titleKey="settingsTitle"
          descriptionKey="settingsDescription"
        />
        <div className="mt-6">
          <LanguageSettings />
        </div>
      </div>
    </TranslationsProvider>
  );
};

export default DashboardLanguageSettingsPage;
