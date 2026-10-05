import type { Metadata } from "next";

import { MyBuildsPage } from "@/features/outfit-build";

import { requireAuthedSession } from "../(dashboard)/requireDashboardSession";

export const metadata: Metadata = { title: "My Builds", robots: { index: false } };

const BuildsRoute = async () => {
  await requireAuthedSession("/builds");
  return <MyBuildsPage />;
};

export default BuildsRoute;
