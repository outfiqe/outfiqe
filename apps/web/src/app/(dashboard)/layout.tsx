import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardMobileNav } from "@/components/DashboardMobileNav";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div>
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8 lg:px-8">
        <DashboardMobileNav />
        <div className="flex gap-4 sm:gap-6 lg:gap-8">
          <DashboardSidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
