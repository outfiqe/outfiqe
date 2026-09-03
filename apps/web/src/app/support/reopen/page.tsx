import type { Metadata } from "next";
import { Suspense } from "react";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

import { ReopenSupportRequest } from "./ReopenSupportRequest";

export const metadata: Metadata = {
  title: "Reopen a support request",
  robots: { index: false, follow: false },
};

const ReopenSupportPage = () => (
  <div>
    <SiteHeader />
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-foreground">Reopen your request</h1>
      <Suspense fallback={<p className="mt-3 text-sm text-muted-foreground">Loading…</p>}>
        <ReopenSupportRequest />
      </Suspense>
    </main>
    <SiteFooter />
  </div>
);

export default ReopenSupportPage;
