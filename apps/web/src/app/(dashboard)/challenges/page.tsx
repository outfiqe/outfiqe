import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { ChallengesSection } from "@/features/creator-dashboard";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Challenges" };

const DashboardChallengesPage = async () => {
  const { user } = await requireDashboardSession("/challenges");
  if (user.role === UserRole.BRAND_OWNER) redirect("/profile");

  return <ChallengesSection />;
};

export default DashboardChallengesPage;
