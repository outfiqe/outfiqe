import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";

import { CreatorStatus, UserRole } from "@/features/auth/types";
import { BrandOverview, getBrandOverviewServer } from "@/features/brand-dashboard";
import { CreatorOverview, getCreatorOverviewServer } from "@/features/creator-dashboard";
import { getQueryClient } from "@/shared/lib/getQueryClient";
import { OVERVIEW_RANGE_SEARCH_PARAM, toOverviewPeriodDays } from "@/shared/lib/overviewPeriod";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Overview" };

type DashboardOverviewPageProps = {
  searchParams: Promise<{ [OVERVIEW_RANGE_SEARCH_PARAM]?: string | string[] }>;
};

const DashboardOverviewPage = async ({ searchParams }: DashboardOverviewPageProps) => {
  const { user, accessToken } = await requireDashboardSession("/overview");
  const periodDays = toOverviewPeriodDays((await searchParams)[OVERVIEW_RANGE_SEARCH_PARAM]);
  const queryClient = getQueryClient();

  if (user.role === UserRole.BRAND_OWNER) {
    await queryClient.prefetchQuery({
      queryKey: ["brand-overview", "mine", periodDays],
      queryFn: () => getBrandOverviewServer(accessToken, periodDays),
    });

    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <BrandOverview />
      </HydrationBoundary>
    );
  }

  if (user.creatorStatus === CreatorStatus.APPROVED) {
    await queryClient.prefetchQuery({
      queryKey: ["creator-overview", "mine", periodDays],
      queryFn: () => getCreatorOverviewServer(accessToken, periodDays),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CreatorOverview creatorStatus={user.creatorStatus} />
    </HydrationBoundary>
  );
};

export default DashboardOverviewPage;
