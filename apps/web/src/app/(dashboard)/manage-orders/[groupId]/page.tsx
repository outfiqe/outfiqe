import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { BrandShipmentDetail, getBrandShipmentServer } from "@/features/brand-dashboard";
import { getQueryClient } from "@/shared/lib/getQueryClient";

import { requireDashboardSession } from "../../requireDashboardSession";

export const metadata: Metadata = { title: "Order" };

interface DashboardShipmentPageProps {
  params: Promise<{ groupId: string }>;
}

const DashboardShipmentPage = async ({ params }: DashboardShipmentPageProps) => {
  const { groupId } = await params;
  const { user, accessToken } = await requireDashboardSession(`/manage-orders/${groupId}`);
  if (user.role !== UserRole.BRAND_OWNER) redirect("/profile");

  const queryClient = getQueryClient();
  try {
    const shipment = await getBrandShipmentServer(accessToken, groupId);
    queryClient.setQueryData(["brand-shipment", groupId], shipment);
  } catch {
    notFound();
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BrandShipmentDetail groupId={groupId} />
    </HydrationBoundary>
  );
};

export default DashboardShipmentPage;
