import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MySizesSettings } from "@/features/saved-sizes";
import { TranslationsProvider } from "@/i18n/TranslationsProvider";

import { requireAuthedSession } from "../../requireDashboardSession";

export const metadata: Metadata = { title: "My sizes" };

const DashboardSizesSettingsPage = async () => {
  await requireAuthedSession("/settings/sizes");
  const t = await getTranslations("savedSizes");

  return (
    <TranslationsProvider>
      <div className="max-w-xl">
        <h1 className="font-display text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("description")}</p>
        <div className="mt-6">
          <MySizesSettings />
        </div>
      </div>
    </TranslationsProvider>
  );
};

export default DashboardSizesSettingsPage;
