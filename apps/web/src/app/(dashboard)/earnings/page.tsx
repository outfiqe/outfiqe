import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreatorStatus, UserRole } from "@/features/auth/types";
import { EarningsSection, getEarningsSummaryServer } from "@/features/creator-dashboard";
import { getQueryClient } from "@/shared/lib/getQueryClient";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Earnings" };

const DashboardEarningsPage = async () => {
  const { user, accessToken } = await requireDashboardSession("/earnings");
  if (user.role === UserRole.BRAND_OWNER) redirect("/profile");

  const queryClient = getQueryClient();
  if (user.creatorStatus === CreatorStatus.APPROVED) {
    await queryClient.prefetchQuery({
      queryKey: ["commissions", "mine", "summary"],
      queryFn: () => getEarningsSummaryServer(accessToken),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EarningsSection creatorStatus={user.creatorStatus} />
    </HydrationBoundary>
  );
};

export default DashboardEarningsPage;
