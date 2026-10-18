import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/DashboardShell";
import { PendingScansProvider } from "@/features/rider";

import { requireRiderSession } from "../requireRiderSession";

export const metadata: Metadata = {
  title: "Rider",
  robots: { index: false, follow: false },
};

const RiderLayout = async ({ children }: { children: ReactNode }) => {
  const { user } = await requireRiderSession("/rider");

  return (
    <PendingScansProvider riderUserId={user.id}>
      <DashboardShell>{children}</DashboardShell>
    </PendingScansProvider>
  );
};

export default RiderLayout;
