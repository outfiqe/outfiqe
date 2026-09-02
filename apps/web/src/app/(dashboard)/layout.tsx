import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div>
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-6xl gap-4 px-4 py-6 sm:gap-6 sm:py-8 lg:gap-8 lg:px-8">
        <DashboardSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
