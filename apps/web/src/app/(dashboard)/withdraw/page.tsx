import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreatorStatus, UserRole } from "@/features/auth/types";
import { CreatorStatusGate } from "@/features/creator-dashboard";
import { OwnerType, WithdrawSection } from "@/features/withdraw";

import { requireDashboardSession } from "../requireDashboardSession";

export const metadata: Metadata = { title: "Withdraw" };

const DashboardWithdrawPage = async () => {
  const { user } = await requireDashboardSession("/withdraw");
  if (user.role === UserRole.BRAND_OWNER) redirect("/profile");

  if (user.creatorStatus !== CreatorStatus.APPROVED) {
    return (
      <CreatorStatusGate
        creatorStatus={user.creatorStatus}
        pitch="Post your fits, tag the pieces you're wearing, and earn commission when someone buys through your post or link."
      />
    );
  }

  return (
    <WithdrawSection
      ownerType={OwnerType.CREATOR}
      title="Withdraw"
      description="Request a withdrawal of your available commission balance to a verified bank account."
    />
  );
};

export default DashboardWithdrawPage;
