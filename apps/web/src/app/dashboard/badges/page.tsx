import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { BadgeCollectionSection } from "@/features/creator-dashboard";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Badge collection" };

const DashboardBadgesPage = async () => {
  const { user } = await requireDashboardSession("/dashboard/badges");
  if (user.role === UserRole.BRAND_OWNER) redirect("/dashboard/profile");

  return <BadgeCollectionSection />;
};

export default DashboardBadgesPage;
