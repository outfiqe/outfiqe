import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import {
  EarningsSection,
  getCommissionEligibilityServer,
  getEarningsSummaryServer,
} from "@/features/creator-dashboard";
import { getQueryClient } from "@/shared/lib/getQueryClient";

import { requireDashboardSession } from "../requireDashboardSession";
import { resolveCanEarn } from "../resolveCanEarn";

export const metadata: Metadata = { title: "Earnings" };

const DashboardEarningsPage = async () => {
  const { user, accessToken } = await requireDashboardSession("/earnings");
  if (user.role === UserRole.BRAND_OWNER) redirect("/profile");

  const canEarn = await resolveCanEarn(user, () => getCommissionEligibilityServer(accessToken));
  const queryClient = getQueryClient();
  if (canEarn) {
    await queryClient.prefetchQuery({
      queryKey: ["commissions", "mine", "summary"],
      queryFn: () => getEarningsSummaryServer(accessToken),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EarningsSection creatorStatus={user.creatorStatus} canEarn={canEarn} />
    </HydrationBoundary>
  );
};

export default DashboardEarningsPage;
