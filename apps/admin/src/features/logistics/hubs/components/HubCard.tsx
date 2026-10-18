import { Badge, Button } from "@outfiqe/design-system";
import { useState } from "react";

import type { Hub } from "../api/hubsSchemas";
import { formatWorkingDays } from "../utils/hubForm.utils";
import { HubFormModal } from "./HubFormModal";
import { HubPickupZonesModal } from "./HubPickupZonesModal";

type HubCardProps = {
  hub: Hub;
  canManage: boolean;
};

const NO_PICKUP_ZONES = 0;

export const HubCard = ({ hub, canManage }: HubCardProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPickupZonesOpen, setIsPickupZonesOpen] = useState(false);
  const {
    name,
    address,
    city,
    phone,
    timeZone,
    workingDays,
    openTime,
    closeTime,
    pickupRoundTimes,
    readyCutoffMinutes,
    partnerCollectionTime,
    isActive,
    pickupZones,
  } = hub;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{name}</p>
            <Badge tone={isActive ? "success" : "neutral"}>{isActive ? "Open" : "Closed"}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {address}, {city} · {phone}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatWorkingDays(workingDays)} · {openTime}–{closeTime} ({timeZone})
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pickup rounds {pickupRoundTimes.join(", ")} · ready {readyCutoffMinutes} min before ·
            partner collects {partnerCollectionTime}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pickupZones.length === NO_PICKUP_ZONES ? (
              <span className="text-xs text-muted-foreground">No pickup areas yet.</span>
            ) : (
              pickupZones.map((zone) => (
                <span
                  key={zone.id}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground"
                >
                  {zone.name}
                </span>
              ))
            )}
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPickupZonesOpen(true)}
            >
              Pickup areas
            </Button>
          </div>
        )}
      </div>

      {isEditOpen && <HubFormModal hub={hub} onClose={() => setIsEditOpen(false)} />}
      {isPickupZonesOpen && (
        <HubPickupZonesModal hub={hub} onClose={() => setIsPickupZonesOpen(false)} />
      )}
    </div>
  );
};
