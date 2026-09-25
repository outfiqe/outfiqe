import { Skeleton } from "@outfiqe/design-system";
import type { Metadata } from "next";
import { Suspense } from "react";

import { SupportRequestsView } from "@/features/support";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Support" };

const DashboardSupportPage = async () => {
  await requireDashboardSession("/support");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Support</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Raise a request and follow every reply in one place.
      </p>

      <div className="mt-6">
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
          <SupportRequestsView />
        </Suspense>
      </div>
    </div>
  );
};

export default DashboardSupportPage;
