import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { getBrandProductsFirstPageServer, ProductsSection } from "@/features/brand-dashboard";
import { getQueryClient } from "@/shared/lib/getQueryClient";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Products" };

const DashboardProductsPage = async () => {
  const { user, accessToken } = await requireDashboardSession("/products");
  if (user.role !== UserRole.BRAND_OWNER) redirect("/profile");

  const queryClient = getQueryClient();
  await queryClient.prefetchInfiniteQuery({
    queryKey: ["brand-products"],
    queryFn: () => getBrandProductsFirstPageServer(accessToken),
    initialPageParam: undefined,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductsSection />
    </HydrationBoundary>
  );
};

export default DashboardProductsPage;
