import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { ChallengesSection, getChallengesServer } from "@/features/creator-dashboard";
import { getQueryClient } from "@/shared/lib/getQueryClient";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Challenges" };

const DashboardChallengesPage = async () => {
  const { user, accessToken } = await requireDashboardSession("/challenges");
  if (user.role === UserRole.BRAND_OWNER) redirect("/profile");

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["challenges", "active"],
    queryFn: () => getChallengesServer(accessToken),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ChallengesSection />
    </HydrationBoundary>
  );
};

export default DashboardChallengesPage;
