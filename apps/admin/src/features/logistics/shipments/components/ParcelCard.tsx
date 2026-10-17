import { Badge, Button, toast } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { useState } from "react";

import type {
  ParcelBooking,
  ShipmentStatusValue,
} from "../../hub-operations/api/hubOperationsSchemas";
import type { ParcelSummary } from "../api/parcelsSchemas";
import { PARCEL_STATUS_LABELS } from "../constants/parcelLabels";
import { ManualBookingForm } from "./ManualBookingForm";
import { RebookParcelModal } from "./RebookParcelModal";

const NOTHING_TO_COLLECT = 0;
const AT_HUB_STATUS: ShipmentStatusValue = "PACKED";
const DELIVERED_STATUS: ShipmentStatusValue = "DELIVERED";
const BOOKED_STATUS: ParcelBooking["status"] = "BOOKED";

type ParcelCardProps = { parcel: ParcelSummary; canManage: boolean };

export const ParcelCard = ({ parcel, canManage }: ParcelCardProps) => {
  const [isRebookModalOpen, setIsRebookModalOpen] = useState(false);
  const {
    shipmentId,
    trackingCode,
    displayTrackingCode,
    status,
    codAmountToCollect,
    isLabelUpToDate,
    recipientName,
    city,
    booking,
  } = parcel;
  const isAtHub = status === AT_HUB_STATUS;
  const isWaitingForBooking = isAtHub && booking !== null && booking.status !== BOOKED_STATUS;

  const copyParcelCode = async () => {
    try {
      await navigator.clipboard.writeText(trackingCode);
      toast.success("Parcel code copied.");
    } catch {
      toast.error("Couldn't copy. Select the code and copy it by hand.");
    }
  };

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-xl font-bold tracking-widest text-foreground">
              {displayTrackingCode}
            </p>
            <button
              type="button"
              onClick={() => void copyParcelCode()}
              className="cursor-pointer rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label={`Copy parcel code ${displayTrackingCode}`}
            >
              <Copy className="size-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            {recipientName} · {city}
            {codAmountToCollect > NOTHING_TO_COLLECT
              ? ` · collect Rs. ${codAmountToCollect.toLocaleString()}`
              : " · prepaid"}
          </p>
          <p className="text-sm text-muted-foreground">
            {booking
              ? `${booking.partnerName}${booking.partnerReference ? ` · ${booking.partnerReference}` : " · not booked yet"}`
              : "No delivery partner chosen"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone={status === DELIVERED_STATUS ? "positive" : "neutral"} showDot={false}>
            {PARCEL_STATUS_LABELS[status]}
          </Badge>
          {isAtHub && !isLabelUpToDate && (
            <Badge tone="negative" showDot={false}>
              Label needs printing
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
        {canManage && isWaitingForBooking && booking && (
          <ManualBookingForm shipmentId={shipmentId} partnerName={booking.partnerName} />
        )}
        <div className="flex flex-wrap gap-2">
          {isAtHub && (
            <Button asChild size="sm" variant="outline">
              <Link to="/logistics/parcels/$shipmentId/label" params={{ shipmentId }}>
                Print label
              </Link>
            </Button>
          )}
          {canManage && isAtHub && (
            <Button size="sm" variant="outline" onClick={() => setIsRebookModalOpen(true)}>
              {booking ? "Change partner" : "Choose partner"}
            </Button>
          )}
          <Button asChild size="sm" variant="ghost">
            <Link to="/logistics/parcels/$shipmentId" params={{ shipmentId }}>
              Open
            </Link>
          </Button>
        </div>
      </div>

      {isRebookModalOpen && (
        <RebookParcelModal
          shipmentId={shipmentId}
          currentPartnerId={booking?.partnerId ?? null}
          onClose={() => setIsRebookModalOpen(false)}
        />
      )}
    </article>
  );
};
