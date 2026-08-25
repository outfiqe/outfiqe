import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { ProductsSection } from "@/features/brand-dashboard";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Products" };

const DashboardProductsPage = async () => {
  const session = await requireDashboardSession("/products");
  if (session.user.role !== UserRole.BRAND_OWNER) redirect("/profile");

  return <ProductsSection />;
};

export default DashboardProductsPage;
