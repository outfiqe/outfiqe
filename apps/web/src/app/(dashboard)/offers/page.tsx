import type { Metadata } from "next";

import { OffersPage } from "@/features/outfit-offers";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Offers" };

const DashboardOffersPage = async () => {
  await requireDashboardSession("/offers");
  return <OffersPage />;
};

export default DashboardOffersPage;
