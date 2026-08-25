import type { Metadata } from "next";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Dashboard" };

const DashboardComingSoonPage = () => {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-foreground">
          Coming soon
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A unified dashboard is on its way. In the meantime, your profile, orders, and account
          settings are available from your account menu.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
};

export default DashboardComingSoonPage;
