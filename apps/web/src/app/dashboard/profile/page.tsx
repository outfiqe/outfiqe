import type { Metadata } from "next";

import { UserRole } from "@/features/auth/types";
import { BrandProfileView, getBrandProfileServer } from "@/features/brand-dashboard";
import { CreatorProfileView, getCreatorProfileServer } from "@/features/creator-dashboard";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Profile" };

const DashboardProfilePage = async () => {
  const { user, accessToken } = await requireDashboardSession("/dashboard/profile");

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
  if (!profile) {
    return (
      <p className="text-sm text-muted-foreground">We couldn&apos;t load your profile right now.</p>
    );
  }
  return <CreatorProfileView profile={profile} />;
};

export default DashboardProfilePage;
