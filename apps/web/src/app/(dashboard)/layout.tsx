import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardShell } from "@/components/DashboardShell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const DashboardLayout = ({ children }: { children: ReactNode }) => (
  <DashboardShell>{children}</DashboardShell>
);

export default DashboardLayout;
