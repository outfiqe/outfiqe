"use client";

import { OwnerType, WithdrawSection } from "@/features/withdraw";

import { useBrandPayoutSummary } from "../hooks/useBrandPayoutSummary";
import { WalletSummaryTiles } from "./WalletSummaryTiles";

export const WalletSection = () => {
  const { data: summary, isPending } = useBrandPayoutSummary();

  return (
    <div>
      <div className="mb-6">
        <WalletSummaryTiles summary={summary} isLoading={isPending} />
      </div>

      <WithdrawSection
        ownerType={OwnerType.BUSINESS}
        title="Wallet"
        description="Track your settlement balance and request a withdrawal to a verified bank account."
      />
    </div>
  );
};
