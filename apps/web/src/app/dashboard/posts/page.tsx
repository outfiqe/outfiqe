import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { LooksSection } from "@/features/creator-dashboard";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Posts" };

export default async function DashboardPostsPage() {
  const session = await requireDashboardSession("/dashboard/posts");
  if (session.user.role === UserRole.BRAND_OWNER) redirect("/dashboard/products");

  return <LooksSection creatorStatus={session.user.creatorStatus} />;
}
