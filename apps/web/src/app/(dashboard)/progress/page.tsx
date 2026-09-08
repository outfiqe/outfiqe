import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { getXpProgressServer, ProgressSection } from "@/features/creator-dashboard";
import { getQueryClient } from "@/shared/lib/getQueryClient";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Your progress" };

const DashboardProgressPage = async () => {
  const { user, accessToken } = await requireDashboardSession("/progress");
  if (user.role === UserRole.BRAND_OWNER) redirect("/profile");

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["xp", "mine", "progress"],
    queryFn: () => getXpProgressServer(accessToken),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProgressSection />
    </HydrationBoundary>
  );
};

export default DashboardProgressPage;
