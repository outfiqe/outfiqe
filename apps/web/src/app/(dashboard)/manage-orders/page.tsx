import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { getBrandShipmentsFirstPageServer, OrdersSection } from "@/features/brand-dashboard";
import { getQueryClient } from "@/shared/lib/getQueryClient";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Orders" };

const DashboardOrdersPage = async () => {
  const { user, accessToken } = await requireDashboardSession("/manage-orders");
  if (user.role !== UserRole.BRAND_OWNER) redirect("/profile");

  const queryClient = getQueryClient();
  await queryClient.prefetchInfiniteQuery({
    queryKey: ["brand-shipments"],
    queryFn: () => getBrandShipmentsFirstPageServer(accessToken),
    initialPageParam: undefined,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OrdersSection />
    </HydrationBoundary>
  );
};

export default DashboardOrdersPage;
