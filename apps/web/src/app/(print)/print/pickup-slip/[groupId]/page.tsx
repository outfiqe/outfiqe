import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { getBrandShipmentServer, PickupSlipPrintPage } from "@/features/brand-dashboard";
import { getQueryClient } from "@/shared/lib/getQueryClient";

import { requireDashboardSession } from "../../../../(dashboard)/requireDashboardSession";

export const metadata: Metadata = { title: "Pickup slip", robots: { index: false } };

interface PickupSlipPageProps {
  params: Promise<{ groupId: string }>;
}

const PickupSlipPage = async ({ params }: PickupSlipPageProps) => {
  const { groupId } = await params;
  const { user, accessToken } = await requireDashboardSession(`/print/pickup-slip/${groupId}`);
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
      <PickupSlipPrintPage fulfilmentGroupId={groupId} />
    </HydrationBoundary>
  );
};

export default PickupSlipPage;
