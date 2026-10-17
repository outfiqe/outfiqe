"use client";

import { QrCode } from "@outfiqe/components";
import { Button, toast } from "@outfiqe/design-system";
import Link from "next/link";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { PickupStatusValue } from "../api/brandPickupSchemas";
import { useMarkReadyForPickup } from "../hooks/useMarkReadyForPickup";

type HubPickupPanelProps = {
  fulfilmentGroupId: string;
  pickupStatus: PickupStatusValue | null;
  pickupCode: string | null;
};

const PICKUP_QR_SIZE_PX = 168;

const PICKUP_PROGRESS_MESSAGE: Partial<Record<PickupStatusValue, string>> = {
  PICKED_UP: "An Outfiqe rider has collected this order. Nothing more to do.",
  AT_HUB: "This order is at the Outfiqe hub. Nothing more to do.",
  IN_PARCEL: "Outfiqe has packed this order for delivery. Nothing more to do.",
  RETURN_AT_HUB: "This order is coming back. A rider will bring the items to you.",
  RETURNING_TO_BRAND: "A rider is bringing these items back to you.",
  RETURNED_TO_BRAND: "These items were returned to you.",
  CANCELLED: "This order was cancelled.",
};

export const HubPickupPanel = ({
  fulfilmentGroupId,
  pickupStatus,
  pickupCode,
}: HubPickupPanelProps) => {
  const markReadyForPickup = useMarkReadyForPickup(fulfilmentGroupId);

  const confirmReady = async () => {
    try {
      await markReadyForPickup.mutateAsync();
      toast.success("Marked ready. A rider will collect it on the next pickup round.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <section
      className="rounded-2xl border border-primary/30 bg-primary/5 p-4"
      aria-labelledby="hub-pickup-heading"
    >
      <h2 id="hub-pickup-heading" className="text-sm font-semibold text-foreground">
        Outfiqe delivers this order
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pack these items, then mark them ready. An Outfiqe rider collects them and we handle the
        delivery, so you don&apos;t need the customer&apos;s details.
      </p>

      {pickupStatus === "AWAITING_BRAND" && (
        <Button
          className="mt-3"
          onClick={() => void confirmReady()}
          disabled={markReadyForPickup.isPending}
        >
          {markReadyForPickup.isPending ? "Marking…" : "Mark ready for pickup"}
        </Button>
      )}

      {pickupStatus === "READY_FOR_PICKUP" && pickupCode && (
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <QrCode
            value={pickupCode}
            label={`Pickup code ${pickupCode}`}
            size={PICKUP_QR_SIZE_PX}
            className="rounded-lg border border-border"
          />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pickup code</p>
            <p className="font-mono text-2xl font-bold tracking-widest text-foreground">
              {pickupCode}
            </p>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Show this to the rider. They scan it, then tag the bag. Printing is optional.
            </p>
            <Link
              href={`/print/pickup-slip/${fulfilmentGroupId}`}
              target="_blank"
              className="mt-2 inline-block cursor-pointer text-sm font-semibold text-primary-strong underline-offset-4 hover:underline"
            >
              Print pickup slip
            </Link>
          </div>
        </div>
      )}

      {pickupStatus && PICKUP_PROGRESS_MESSAGE[pickupStatus] && (
        <p className="mt-3 text-sm font-medium text-foreground">
          {PICKUP_PROGRESS_MESSAGE[pickupStatus]}
        </p>
      )}
    </section>
  );
};
