import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { BadgeCollectionSection, getBadgeCollectionServer } from "@/features/creator-dashboard";
import { getQueryClient } from "@/shared/lib/getQueryClient";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Badge collection" };

const DashboardBadgesPage = async () => {
  const { user, accessToken } = await requireDashboardSession("/badges");
  if (user.role === UserRole.BRAND_OWNER) redirect("/profile");

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["badges", "mine", "collection"],
    queryFn: () => getBadgeCollectionServer(accessToken),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BadgeCollectionSection />
    </HydrationBoundary>
  );
};

export default DashboardBadgesPage;
