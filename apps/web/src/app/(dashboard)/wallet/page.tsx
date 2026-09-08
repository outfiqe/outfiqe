import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { getBrandPayoutSummaryServer, WalletSection } from "@/features/brand-dashboard";
import { getQueryClient } from "@/shared/lib/getQueryClient";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Wallet" };

const DashboardWalletPage = async () => {
  const { user, accessToken } = await requireDashboardSession("/wallet");
  if (user.role !== UserRole.BRAND_OWNER) redirect("/profile");

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["brand-payouts", "mine", "summary"],
    queryFn: () => getBrandPayoutSummaryServer(accessToken),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WalletSection />
    </HydrationBoundary>
  );
};

export default DashboardWalletPage;
