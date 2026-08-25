import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CreatorStatus, UserRole } from "@/features/auth/types";
import { BrandProfileView, getBrandProfileServer } from "@/features/brand-dashboard";
import { CreatorStatusGate, getCreatorProfileServer } from "@/features/creator-dashboard";
import { CreatorProfile, getCreatorProfileServerPublic } from "@/features/creator-profile";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Profile" };

const DashboardProfilePage = async () => {
  const { user, accessToken } = await requireDashboardSession("/profile");

  if (user.role === UserRole.BRAND_OWNER) {
    const profile = await getBrandProfileServer(accessToken);
    if (!profile) {
      return (
        <p className="text-sm text-muted-foreground">We couldn&apos;t load your brand right now.</p>
      );
    }
    return <BrandProfileView profile={profile} />;
  }

  const profile = await getCreatorProfileServer(accessToken);
  if (!profile) notFound();

  if (profile.creatorStatus !== CreatorStatus.APPROVED) {
    return (
      <CreatorStatusGate
        creatorStatus={profile.creatorStatus}
        pitch="Set up your public creator profile — post your fits and let people discover what you're wearing."
      />
    );
  }

  const creator = await getCreatorProfileServerPublic(profile.handle);
  if (!creator) notFound();

  return <CreatorProfile creator={creator} />;
};

export default DashboardProfilePage;
