import type { Metadata } from "next";

import { MyMeasurementsSettings } from "@/features/size-fit";
import { TranslatedPageHeading } from "@/i18n/TranslatedPageHeading";
import { TranslationsProvider } from "@/i18n/TranslationsProvider";

import { requireAuthedSession } from "../../requireDashboardSession";

export const metadata: Metadata = { title: "My measurements" };

const DashboardMeasurementsSettingsPage = async () => {
  await requireAuthedSession("/settings/measurements");

  return (
    <TranslationsProvider>
      <div className="max-w-xl">
        <TranslatedPageHeading
          namespace="fitProfile"
          titleKey="title"
          descriptionKey="description"
        />
        <div className="mt-6">
          <MyMeasurementsSettings />
        </div>
      </div>
    </TranslationsProvider>
  );
};

export default DashboardMeasurementsSettingsPage;
