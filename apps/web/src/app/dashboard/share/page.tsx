import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { ShareSection } from "@/features/creator-dashboard";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Share" };

const DashboardSharePage = async () => {
  const { user } = await requireDashboardSession("/dashboard/share");
  if (user.role === UserRole.BRAND_OWNER) redirect("/dashboard/profile");

  return <ShareSection creatorStatus={user.creatorStatus} />;
};

export default DashboardSharePage;
