"use client";

import { Skeleton } from "@outfiqe/design-system";
import { RotateCcw, Truck } from "lucide-react";

import { useDeliveryZones } from "@/features/delivery-zones";
import { formatRupees } from "@/shared/lib/formatRupees";

import { summarizeDeliveryFees } from "../utils/summarizeDeliveryFees";

const DAMAGED_OR_WRONG_ITEM_NOTE = "Damaged or wrong item? Tell us within 7 days";

export const ShippingInfo = () => {
  const { data: zones, isLoading: isZonesLoading } = useDeliveryZones();
  const deliveryFees = summarizeDeliveryFees(zones ?? []);

  return (
    <div className="mt-4 space-y-2.5 rounded-xl border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground">
      {isZonesLoading && (
        <Skeleton role="status" aria-label="Loading delivery estimate" className="h-4 w-3/4" />
      )}

      {!isZonesLoading && deliveryFees && (
        <div className="flex items-center gap-2.5">
          <Truck aria-hidden="true" className="size-4 shrink-0 text-foreground" />
          <span>
            Delivery from{" "}
            <span className="font-semibold text-foreground">
              {formatRupees(deliveryFees.lowestFee)}
            </span>
            {deliveryFees.sharedFreeDeliveryThreshold !== null &&
              ` · Free above ${formatRupees(deliveryFees.sharedFreeDeliveryThreshold)}`}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2.5">
        <RotateCcw className="size-4 shrink-0 text-foreground" />
        <span>{DAMAGED_OR_WRONG_ITEM_NOTE}</span>
      </div>
    </div>
  );
};
