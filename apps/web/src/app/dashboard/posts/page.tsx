import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { LooksSection } from "@/features/creator-dashboard";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Posts" };

const DashboardPostsPage = async () => {
  const { user } = await requireDashboardSession("/dashboard/posts");
  if (user.role === UserRole.BRAND_OWNER) redirect("/dashboard/products");

  return <LooksSection creatorStatus={user.creatorStatus} />;
};

export default DashboardPostsPage;
