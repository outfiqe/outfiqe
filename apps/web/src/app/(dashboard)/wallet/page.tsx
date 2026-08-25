import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { WalletSection } from "@/features/brand-dashboard";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Wallet" };

const DashboardWalletPage = async () => {
  const { user } = await requireDashboardSession("/wallet");
  if (user.role !== UserRole.BRAND_OWNER) redirect("/profile");

  return <WalletSection />;
};

export default DashboardWalletPage;
