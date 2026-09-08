import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { TagReviewsSection } from "@/features/brand-dashboard";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Tag reviews" };

const DashboardTagReviewsPage = async () => {
  const { user } = await requireDashboardSession("/tag-reviews");
  if (user.role !== UserRole.BRAND_OWNER) redirect("/profile");

  return <TagReviewsSection />;
};

export default DashboardTagReviewsPage;
