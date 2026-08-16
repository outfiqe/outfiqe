import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { OrdersSection } from "@/features/brand-dashboard";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Orders" };

const DashboardOrdersPage = async () => {
  const session = await requireDashboardSession("/dashboard/orders");
  if (session.user.role !== UserRole.BRAND_OWNER) redirect("/dashboard/profile");

  return <OrdersSection />;
};

export default DashboardOrdersPage;
