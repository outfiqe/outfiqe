import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getServerSessionWithToken } from "@/features/auth/api/serverAuth";
import { UserRole } from "@/features/auth/types";
import { SupportRequestsView } from "@/features/support";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:5173";

export const metadata: Metadata = { title: "Support", robots: { index: false, follow: false } };

const SupportPage = async () => {
  const session = await getServerSessionWithToken();
  if (!session) redirect("/login?redirect=/support");
  if (session.user.role === UserRole.ADMIN) redirect(ADMIN_URL);

  return (
    <div className="pb-20 lg:pb-0">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-10 lg:px-10">
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Support</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Raise a request and follow every reply in one place.
        </p>

        <div className="mt-8">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
            <SupportRequestsView />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
};

export default SupportPage;
