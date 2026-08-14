import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { ProductsSection } from "@/features/brand-dashboard";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Products" };

export default async function DashboardProductsPage() {
  const session = await requireDashboardSession("/dashboard/products");
  if (session.user.role !== UserRole.BRAND_OWNER) redirect("/dashboard/profile");

  return <ProductsSection />;
}
