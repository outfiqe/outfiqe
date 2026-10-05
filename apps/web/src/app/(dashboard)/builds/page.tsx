import type { Metadata } from "next";

import { MyBuildsPage } from "@/features/outfit-build";
import { TranslationsProvider } from "@/i18n/TranslationsProvider";

import { requireAuthedSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "My Builds", robots: { index: false } };

const BuildsRoute = async () => {
  await requireAuthedSession("/builds");
  return (
    <TranslationsProvider>
      <MyBuildsPage />
    </TranslationsProvider>
  );
};

export default BuildsRoute;
