import type { ReactNode } from "react";

import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SiteHeader } from "@/components/SiteHeader";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-6xl gap-8 px-4 py-8 lg:px-8">
        <DashboardSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
