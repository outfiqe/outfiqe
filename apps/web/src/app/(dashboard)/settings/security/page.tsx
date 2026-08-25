import type { Metadata } from "next";

import { AddPhoneNumberBanner, ConnectedAccounts } from "@/features/auth";

import { requireDashboardSession } from "../../requireDashboardSession";

export const metadata: Metadata = { title: "Security" };

const DashboardSecurityPage = async () => {
  const { user } = await requireDashboardSession("/settings/security");

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-bold text-foreground">Security</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Manage how you sign in to your Outfiqe account.
      </p>

      {!user.phone && (
        <div className="mt-6">
          <AddPhoneNumberBanner />
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-foreground">Connected accounts</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Sign in faster by connecting Google or Facebook.
        </p>
        <div className="mt-3">
          <ConnectedAccounts hasPassword={user.hasPassword ?? true} />
        </div>
      </div>
    </div>
  );
};

export default DashboardSecurityPage;
