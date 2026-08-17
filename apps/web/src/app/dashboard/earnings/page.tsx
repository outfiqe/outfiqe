import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { EarningsSection } from "@/features/creator-dashboard";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Earnings" };

const DashboardEarningsPage = async () => {
  const { user } = await requireDashboardSession("/dashboard/earnings");
  if (user.role === UserRole.BRAND_OWNER) redirect("/dashboard/profile");

  return <EarningsSection creatorStatus={user.creatorStatus} />;
};

export default DashboardEarningsPage;
