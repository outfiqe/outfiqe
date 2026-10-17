import { FormBanner, Skeleton } from "@outfiqe/design-system";
import { useState } from "react";

import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { useCodSummary } from "../hooks/useCodSummary";
import { CodPartnerSummaryList } from "./CodPartnerSummaryList";
import { CodRemittancesSection } from "./CodRemittancesSection";
import { UnremittedParcelsSection } from "./UnremittedParcelsSection";

const NO_PARTNERS = 0;
const SKELETON_CARD_COUNT = 3;

export const CodPage = () => {
  const { canUse } = usePlatformPermissions();
  const canManage = canUse(PLATFORM_MANAGE_PERMISSION.LOGISTICS);
  const { data: partners, isPending, isError } = useCodSummary();
  const [chosenPartnerId, setChosenPartnerId] = useState<string | null>(null);
  const selectedPartner =
    partners?.find(({ partnerId }) => partnerId === chosenPartnerId) ?? partners?.[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Partner cash</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cash delivery partners collected on our parcels and haven&apos;t paid in yet. When a
          payment arrives, tick the parcels it covers, enter each partner fee and record it, so no
          parcel&apos;s cash is counted twice.
        </p>
      </div>

      {isError && <FormBanner>We couldn&apos;t load partner cash.</FormBanner>}
      {isPending && (
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading partner cash"
        >
          {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      )}
      {partners && partners.length === NO_PARTNERS && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No partner is holding cash for us right now.
        </p>
      )}
      {partners && selectedPartner && (
        <>
          <CodPartnerSummaryList
            partners={partners}
            selectedPartnerId={selectedPartner.partnerId}
            onSelectPartner={setChosenPartnerId}
          />
          <UnremittedParcelsSection
            key={selectedPartner.partnerId}
            partner={selectedPartner}
            canManage={canManage}
          />
          <CodRemittancesSection partnerId={selectedPartner.partnerId} />
        </>
      )}
    </div>
  );
};
