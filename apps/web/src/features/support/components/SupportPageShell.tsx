import type { ReactNode } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const SupportPageShell = ({ children }: { children: ReactNode }) => (
  <div className="pb-20 lg:pb-0">
    <SiteHeader />
    <main className="mx-auto max-w-2xl px-6 py-10 lg:px-10">
      <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Support</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Raise a request and follow every reply in one place.
      </p>

      <div className="mt-8">{children}</div>
    </main>
    <SiteFooter />
    <MobileTabBar />
  </div>
);
