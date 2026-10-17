import { Button, Checkbox } from "@outfiqe/design-system";
import { useState } from "react";

import type { Hub } from "../../hubs/api/hubsSchemas";
import type { PickupBoardLocation } from "../api/pickupBoardSchemas";
import { formatRoundStart } from "../utils/roundTime.utils";
import { AssignRiderModal } from "./AssignRiderModal";

const SHORT_ORDER_ID_LENGTH = 8;
const NO_PICKUPS_CHOSEN = 0;

type PickupLocationCardProps = {
  hub: Hub;
  location: PickupBoardLocation;
  canManage: boolean;
};

export const PickupLocationCard = ({ hub, location, canManage }: PickupLocationCardProps) => {
  const { brandName, label, address, city, pickups } = location;
  const [unchosenGroupIds, setUnchosenGroupIds] = useState<ReadonlySet<string>>(new Set());
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const chosenGroupIds = pickups
    .map((pickup) => pickup.fulfilmentGroupId)
    .filter((groupId) => !unchosenGroupIds.has(groupId));

  const togglePickup = (groupId: string) => {
    setUnchosenGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{brandName}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {label} · {address}, {city}
          </p>
        </div>
        {canManage && (
          <Button
            size="sm"
            onClick={() => setIsAssignOpen(true)}
            disabled={chosenGroupIds.length === NO_PICKUPS_CHOSEN}
          >
            Assign rider
          </Button>
        )}
      </div>

      <ul className="mt-3 space-y-1.5">
        {pickups.map(({ fulfilmentGroupId, orderId, itemCount, readyForPickupAt }) => (
          <li key={fulfilmentGroupId}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              {canManage && (
                <Checkbox
                  checked={!unchosenGroupIds.has(fulfilmentGroupId)}
                  onChange={() => togglePickup(fulfilmentGroupId)}
                />
              )}
              <span>
                Order #{orderId.slice(0, SHORT_ORDER_ID_LENGTH).toUpperCase()} · {itemCount} item(s)
                {readyForPickupAt ? ` · ready since ${formatRoundStart(readyForPickupAt)}` : ""}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {isAssignOpen && (
        <AssignRiderModal
          hub={hub}
          location={location}
          fulfilmentGroupIds={chosenGroupIds}
          onClose={() => setIsAssignOpen(false)}
        />
      )}
    </div>
  );
};
