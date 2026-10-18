import { Button, Checkbox, FormBanner } from "@outfiqe/design-system";
import { useState } from "react";

import type { CodPartnerSummary, UnremittedParcel } from "../api/codSchemas";
import { useInfiniteUnremittedParcels } from "../hooks/useInfiniteUnremittedParcels";
import {
  defaultPartnerFee,
  formatCashAmount,
  type PartnerFeeByShipmentId,
  sumRemittanceTotals,
} from "../utils/codRemittance.utils";
import { RecordRemittanceModal } from "./RecordRemittanceModal";
import { UnremittedParcelsTable } from "./UnremittedParcelsTable";

const NO_TICKED_PARCELS = 0;

type UnremittedParcelsSectionProps = { partner: CodPartnerSummary; canManage: boolean };

export const UnremittedParcelsSection = ({ partner, canManage }: UnremittedParcelsSectionProps) => {
  const [isOnlyOverdue, setIsOnlyOverdue] = useState(false);
  const [feeByShipmentId, setFeeByShipmentId] = useState<PartnerFeeByShipmentId>({});
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const parcelsQuery = useInfiniteUnremittedParcels(partner.partnerId, isOnlyOverdue);
  const parcels = parcelsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const totals = sumRemittanceTotals(parcels, feeByShipmentId);
  const hasTickedParcels = totals.parcelCount > NO_TICKED_PARCELS;

  const toggleParcel = (parcel: UnremittedParcel) =>
    setFeeByShipmentId((currentFees) => {
      const { [parcel.shipmentId]: removedFee, ...otherFees } = currentFees;
      return removedFee === undefined
        ? { ...currentFees, [parcel.shipmentId]: defaultPartnerFee(parcel) }
        : otherFees;
    });

  const changePartnerFee = (shipmentId: string, partnerFee: number) =>
    setFeeByShipmentId((currentFees) => ({ ...currentFees, [shipmentId]: partnerFee }));

  const switchOverdueFilter = (shouldShowOnlyOverdue: boolean) => {
    setIsOnlyOverdue(shouldShowOnlyOverdue);
    setFeeByShipmentId({});
  };

  const finishRecording = () => {
    setFeeByShipmentId({});
    setIsRecordModalOpen(false);
  };

  return (
    <section className="space-y-3" aria-labelledby="unremitted-parcels-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="unremitted-parcels-heading" className="text-lg font-semibold text-foreground">
          Cash {partner.partnerName} still holds
        </h2>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={isOnlyOverdue}
            onChange={(event) => switchOverdueFilter(event.target.checked)}
          />
          Only overdue parcels
        </label>
      </div>

      {parcelsQuery.isError && <FormBanner>We couldn&apos;t load these parcels.</FormBanner>}
      <UnremittedParcelsTable
        parcels={parcels}
        isLoading={parcelsQuery.isPending}
        canTick={canManage}
        feeByShipmentId={feeByShipmentId}
        onToggleParcel={toggleParcel}
        onChangeFee={changePartnerFee}
      />
      {parcelsQuery.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void parcelsQuery.fetchNextPage()}
          isLoading={parcelsQuery.isFetchingNextPage}
        >
          Show more parcels
        </Button>
      )}

      {canManage && hasTickedParcels && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-foreground">
            {totals.parcelCount} parcels ticked · {formatCashAmount(totals.receivedAmount)} expected
            after {formatCashAmount(totals.partnerFeeAmount)} in fees
          </p>
          <Button onClick={() => setIsRecordModalOpen(true)}>Record payment</Button>
        </div>
      )}

      {isRecordModalOpen && (
        <RecordRemittanceModal
          partnerId={partner.partnerId}
          partnerName={partner.partnerName}
          lines={Object.entries(feeByShipmentId).map(([shipmentId, partnerFeeAmount]) => ({
            shipmentId,
            partnerFeeAmount,
          }))}
          totals={totals}
          onRecorded={finishRecording}
          onClose={() => setIsRecordModalOpen(false)}
        />
      )}
    </section>
  );
};
