import type { Metadata } from "next";

import { UserRole } from "@/features/auth/types";
import { BrandOverview } from "@/features/brand-dashboard";
import { CreatorOverview } from "@/features/creator-dashboard";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Overview" };

const DashboardOverviewPage = async () => {
  const { user } = await requireDashboardSession("/overview");

  if (user.role === UserRole.BRAND_OWNER) return <BrandOverview />;

  return <CreatorOverview creatorStatus={user.creatorStatus} />;
};

export default DashboardOverviewPage;
