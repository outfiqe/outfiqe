import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { PickupLocationsSection } from "@/features/brand-dashboard";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Pickup locations" };

const DashboardPickupLocationsPage = async () => {
  const { user } = await requireDashboardSession("/pickup-locations");
  if (user.role !== UserRole.BRAND_OWNER) redirect("/profile");

  return <PickupLocationsSection />;
};

export default DashboardPickupLocationsPage;
