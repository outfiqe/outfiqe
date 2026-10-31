import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";

import { CreatorStatus, UserRole } from "@/features/auth/types";
import { BrandOverview, getBrandOverviewServer } from "@/features/brand-dashboard";
import { CreatorOverview, getCreatorOverviewServer } from "@/features/creator-dashboard";
import { getQueryClient } from "@/shared/lib/getQueryClient";
import { DEFAULT_OVERVIEW_PERIOD_DAYS } from "@/shared/lib/overviewPeriod";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Overview" };

const DashboardOverviewPage = async () => {
  const { user, accessToken } = await requireDashboardSession("/overview");
  const queryClient = getQueryClient();

  if (user.role === UserRole.BRAND_OWNER) {
    await queryClient.prefetchQuery({
      queryKey: ["brand-overview", "mine", DEFAULT_OVERVIEW_PERIOD_DAYS],
      queryFn: () => getBrandOverviewServer(accessToken),
    });

    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <BrandOverview />
      </HydrationBoundary>
    );
  }

  if (user.creatorStatus === CreatorStatus.APPROVED) {
    await queryClient.prefetchQuery({
      queryKey: ["creator-overview", "mine", DEFAULT_OVERVIEW_PERIOD_DAYS],
      queryFn: () => getCreatorOverviewServer(accessToken),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CreatorOverview creatorStatus={user.creatorStatus} />
    </HydrationBoundary>
  );
};

export default DashboardOverviewPage;
