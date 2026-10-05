import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UserRole } from "@/features/auth/types";
import { CreatorStatusGate, getCommissionEligibilityServer } from "@/features/creator-dashboard";
import { OwnerType, WithdrawSection } from "@/features/withdraw";

import { requireDashboardSession } from "../requireDashboardSession";
import { resolveCanEarn } from "../resolveCanEarn";

export const metadata: Metadata = { title: "Withdraw" };

const DashboardWithdrawPage = async () => {
  const { user, accessToken } = await requireDashboardSession("/withdraw");
  if (user.role === UserRole.BRAND_OWNER) redirect("/profile");

  const canEarn = await resolveCanEarn(user, () => getCommissionEligibilityServer(accessToken));
  if (!canEarn) {
    return (
      <CreatorStatusGate
        creatorStatus={user.creatorStatus}
        pitch="Drop your fits, tag the pieces you're wearing, and earn commission when someone buys through your drop or link."
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
