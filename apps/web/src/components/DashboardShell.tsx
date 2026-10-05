import type { ReactNode } from "react";

import { TourLaunchProvider, TourLoadingShell } from "@/features/product-tour";

import { DashboardMobileNavBar } from "./DashboardMobileNavBar";
import { DashboardSidebar } from "./DashboardSidebar";
import { SiteHeader } from "./SiteHeader";

export const DashboardShell = ({ children }: { children: ReactNode }) => (
  <TourLaunchProvider>
    <div>
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-6xl gap-4 px-4 pb-32 pt-6 sm:gap-6 sm:pt-8 lg:gap-8 lg:px-8 lg:pb-8">
        <DashboardSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <DashboardMobileNavBar />
    </div>
    <TourLoadingShell />
  </TourLaunchProvider>
);
