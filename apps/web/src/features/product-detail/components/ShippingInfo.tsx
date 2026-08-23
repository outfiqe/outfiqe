"use client";

import { RotateCcw, Truck } from "lucide-react";

import { resolveZonePreview, useDeliveryZones } from "@/features/delivery-zones";

export const ShippingInfo = () => {
  const { data: zones } = useDeliveryZones();
  const defaultZone = resolveZonePreview(zones ?? [], "");

  return (
    <div className="mt-4 space-y-2.5 rounded-xl border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground">
      {defaultZone && (
        <div className="flex items-center gap-2.5">
          <Truck className="size-4 shrink-0 text-foreground" />
          <span>
            <span className="font-semibold text-foreground">
              Rs. {defaultZone.standardDeliveryFee}
            </span>{" "}
            delivery to {defaultZone.name}
            {defaultZone.freeDeliveryThreshold > 0 &&
              ` · Free above Rs. ${defaultZone.freeDeliveryThreshold.toLocaleString()}`}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2.5">
        <RotateCcw className="size-4 shrink-0 text-foreground" />
        <span>Returns within 7 days if unworn</span>
      </div>
    </div>
  );
};
