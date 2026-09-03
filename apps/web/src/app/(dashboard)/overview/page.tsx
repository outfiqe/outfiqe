import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { CreatorOverview } from "@/features/creator-dashboard";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Overview" };

const DashboardOverviewPage = async () => {
  const { user } = await requireDashboardSession("/overview");
  if (user.role === UserRole.BRAND_OWNER) redirect("/profile");

  return <CreatorOverview creatorStatus={user.creatorStatus} />;
};

export default DashboardOverviewPage;
