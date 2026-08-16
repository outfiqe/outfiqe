import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CreatorProfile, getCreatorProfileServerPublic } from "@/features/creator-profile";

import { requireDashboardSession } from "../../requireDashboardSession";

interface DashboardCreatorProfilePageProps {
  params: Promise<{ handle: string }>;
}

export const generateMetadata = async ({
  params,
}: DashboardCreatorProfilePageProps): Promise<Metadata> => {
  const { handle } = await params;
  const creator = await getCreatorProfileServerPublic(handle);
  return { title: creator ? creator.name : "Profile" };
};

const DashboardCreatorProfilePage = async ({ params }: DashboardCreatorProfilePageProps) => {
  await requireDashboardSession("/dashboard/profile");
  const { handle } = await params;

  const creator = await getCreatorProfileServerPublic(handle);
  if (!creator) notFound();

  return <CreatorProfile creator={creator} />;
};

export default DashboardCreatorProfilePage;
