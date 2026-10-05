import type { Metadata } from "next";

import { MySizesSettings } from "@/features/saved-sizes";
import { TranslatedPageHeading } from "@/i18n/TranslatedPageHeading";
import { TranslationsProvider } from "@/i18n/TranslationsProvider";

import { requireAuthedSession } from "../../requireDashboardSession";

export const metadata: Metadata = { title: "My sizes" };

const DashboardSizesSettingsPage = async () => {
  await requireAuthedSession("/settings/sizes");

  return (
    <TranslationsProvider>
      <div className="max-w-xl">
        <TranslatedPageHeading
          namespace="savedSizes"
          titleKey="title"
          descriptionKey="description"
        />
        <div className="mt-6">
          <MySizesSettings />
        </div>
      </div>
    </TranslationsProvider>
  );
};

export default DashboardSizesSettingsPage;
