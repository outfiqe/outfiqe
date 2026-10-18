import { Badge, Button, FormBanner, Skeleton } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import type { ShipmentStatusValue } from "../../hub-operations/api/hubOperationsSchemas";
import { PARCEL_STATUS_LABELS, RETURN_OUTCOME_LABELS } from "../constants/parcelLabels";
import { useParcel } from "../hooks/useParcel";
import { describeParcelEventCode } from "../utils/parcelEvent.utils";
import { RebookParcelModal } from "./RebookParcelModal";
import { RecordParcelUpdateModal } from "./RecordParcelUpdateModal";
import { ReturnCheckInModal } from "./ReturnCheckInModal";

const AT_HUB_STATUS: ShipmentStatusValue = "PACKED";
const NOTHING_TO_COLLECT = 0;
const NOTE_EVENT_CODE = "NOTE";
const STATUSES_THAT_CAN_COME_BACK: ReadonlySet<ShipmentStatusValue> = new Set([
  "HANDED_TO_PARTNER",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERY_FAILED",
  "RETURNING",
  "RETURNED_TO_HUB",
]);

type ParcelDetailPageProps = { shipmentId: string };

export const ParcelDetailPage = ({ shipmentId }: ParcelDetailPageProps) => {
  const { canUse } = usePlatformPermissions();
  const canManage = canUse(PLATFORM_MANAGE_PERMISSION.LOGISTICS);
  const { data: parcel, isPending, isError } = useParcel(shipmentId);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isRebookModalOpen, setIsRebookModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  if (isError) return <FormBanner>We couldn&apos;t load this parcel.</FormBanner>;
  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading parcel">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const isAtHub = parcel.status === AT_HUB_STATUS;
  const canCheckInReturn =
    parcel.returnCheckedInAt === null && STATUSES_THAT_CAN_COME_BACK.has(parcel.status);

  return (
    <div className="space-y-6">
      <Link
        to="/logistics/parcels"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Parcels
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-widest text-foreground">
            {parcel.displayTrackingCode}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {parcel.recipientName} · {parcel.city} ·{" "}
            {parcel.codAmountToCollect > NOTHING_TO_COLLECT
              ? `collect Rs. ${parcel.codAmountToCollect.toLocaleString()}`
              : "prepaid"}{" "}
            · {parcel.weightGrams} g · {parcel.parcelCount} piece(s)
          </p>
          {parcel.codCollectedAmount !== null && parcel.codCollectedAmount > NOTHING_TO_COLLECT && (
            <p className="text-sm text-muted-foreground">
              Partner collected Rs. {parcel.codCollectedAmount.toLocaleString()} ·{" "}
              {parcel.codRemittanceId ? "paid in to Outfiqe" : "not paid in yet"}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {parcel.booking
              ? `${parcel.booking.partnerName} · ${parcel.booking.partnerReference ?? "not booked yet"}`
              : "No delivery partner chosen"}
          </p>
        </div>
        <Badge tone="neutral" showDot={false}>
          {PARCEL_STATUS_LABELS[parcel.status]}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {isAtHub && (
          <Button asChild variant="outline">
            <Link to="/logistics/parcels/$shipmentId/label" params={{ shipmentId }}>
              Print label
            </Link>
          </Button>
        )}
        {canManage && isAtHub && (
          <Button variant="outline" onClick={() => setIsRebookModalOpen(true)}>
            {parcel.booking ? "Change partner" : "Choose partner"}
          </Button>
        )}
        {canManage && <Button onClick={() => setIsUpdateModalOpen(true)}>Record an update</Button>}
        {canManage && canCheckInReturn && (
          <Button variant="outline" onClick={() => setIsReturnModalOpen(true)}>
            Check in return
          </Button>
        )}
      </div>

      {parcel.returnOutcome && (
        <FormBanner tone="neutral">
          Came back: {RETURN_OUTCOME_LABELS[parcel.returnOutcome]}.
          {parcel.partnerClaimAmount !== null
            ? ` Claim against the partner for Rs. ${parcel.partnerClaimAmount.toLocaleString()} (${parcel.partnerClaimStatus ?? "open"}).`
            : ""}
        </FormBanner>
      )}

      <section
        aria-labelledby="parcel-contents-heading"
        className="rounded-xl border border-border bg-card p-4"
      >
        <h2 id="parcel-contents-heading" className="font-display text-sm font-bold text-foreground">
          In this parcel
        </h2>
        <ul className="mt-2 space-y-2 text-sm">
          {parcel.pickups.map(({ fulfilmentGroupId, brandName, items }) => (
            <li key={fulfilmentGroupId}>
              <p className="font-medium text-foreground">{brandName}</p>
              <p className="text-muted-foreground">
                {items
                  .map(
                    ({ productName, sizeLabel, units }) =>
                      `${productName} · ${sizeLabel} × ${units}`,
                  )
                  .join(", ")}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="parcel-timeline-heading"
        className="rounded-xl border border-border bg-card p-4"
      >
        <h2 id="parcel-timeline-heading" className="font-display text-sm font-bold text-foreground">
          What happened
        </h2>
        <ol className="mt-2 space-y-3 text-sm">
          {parcel.events.map(
            ({
              id,
              code,
              source,
              rawStatus,
              note,
              occurredAt,
              appliedToStatus,
              partnerName,
              actorName,
            }) => (
              <li key={id} className="border-l-2 border-border pl-3">
                <p className="font-medium text-foreground">
                  {describeParcelEventCode(code)}
                  {rawStatus ? ` · "${rawStatus}"` : ""}
                  {!appliedToStatus && code !== NOTE_EVENT_CODE ? " · recorded only" : ""}
                </p>
                <p className="text-muted-foreground">
                  {new Date(occurredAt).toLocaleString()} · {partnerName ?? actorName ?? source}
                </p>
                {note && <p className="text-muted-foreground">{note}</p>}
              </li>
            ),
          )}
        </ol>
      </section>

      {isUpdateModalOpen && (
        <RecordParcelUpdateModal
          shipmentId={shipmentId}
          codAmountToCollect={parcel.codAmountToCollect}
          onClose={() => setIsUpdateModalOpen(false)}
        />
      )}
      {isReturnModalOpen && (
        <ReturnCheckInModal parcel={parcel} onClose={() => setIsReturnModalOpen(false)} />
      )}
      {isRebookModalOpen && (
        <RebookParcelModal
          shipmentId={shipmentId}
          currentPartnerId={parcel.booking?.partnerId ?? null}
          onClose={() => setIsRebookModalOpen(false)}
        />
      )}
    </div>
  );
};
