import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { ProgressSection } from "@/features/creator-dashboard";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Your progress" };

const DashboardProgressPage = async () => {
  const { user } = await requireDashboardSession("/dashboard/progress");
  if (user.role === UserRole.BRAND_OWNER) redirect("/dashboard/profile");

  return <ProgressSection />;
};

export default DashboardProgressPage;
