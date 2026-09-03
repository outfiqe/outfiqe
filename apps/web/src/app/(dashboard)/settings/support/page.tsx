import type { Metadata } from "next";
import { Suspense } from "react";

import { SupportRequestsView } from "@/features/support";

import { requireDashboardSession } from "../../requireDashboardSession";

export const metadata: Metadata = { title: "Support", robots: { index: false, follow: false } };

const DashboardSupportPage = async () => {
  await requireDashboardSession("/settings/support");

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-bold text-foreground">Support</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Raise a request and follow every reply in one place.
      </p>

      <div className="mt-6">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <SupportRequestsView />
        </Suspense>
      </div>
    </div>
  );
};

export default DashboardSupportPage;
