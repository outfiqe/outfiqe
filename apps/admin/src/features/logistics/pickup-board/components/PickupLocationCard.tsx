import { Button, Checkbox } from "@outfiqe/design-system";
import { useState } from "react";

import type { Hub } from "../../hubs/api/hubsSchemas";
import type { PickupBoardLocation } from "../api/pickupBoardSchemas";
import { BOARD_RETURN_SOURCE_LABELS } from "../constants/riderTaskLabels";
import { formatRoundStart } from "../utils/roundTime.utils";
import { AssignRiderModal } from "./AssignRiderModal";

const SHORT_ORDER_ID_LENGTH = 8;
const NO_STOPS_CHOSEN = 0;

type PickupLocationCardProps = {
  hub: Hub;
  location: PickupBoardLocation;
  canManage: boolean;
};

const toggleInSet = (current: ReadonlySet<string>, id: string): ReadonlySet<string> => {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

const shortOrderId = (orderId: string) => orderId.slice(0, SHORT_ORDER_ID_LENGTH).toUpperCase();

export const PickupLocationCard = ({ hub, location, canManage }: PickupLocationCardProps) => {
  const { brandName, label, address, city, pickups, returns } = location;
  const [unchosenIds, setUnchosenIds] = useState<ReadonlySet<string>>(new Set());
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const chosenGroupIds = pickups
    .map(({ fulfilmentGroupId }) => fulfilmentGroupId)
    .filter((groupId) => !unchosenIds.has(groupId));
  const chosenReturnIds = returns
    .map(({ brandReturnId }) => brandReturnId)
    .filter((brandReturnId) => !unchosenIds.has(brandReturnId));
  const chosenStopCount = chosenGroupIds.length + chosenReturnIds.length;
  const toggleStop = (id: string) => setUnchosenIds((current) => toggleInSet(current, id));

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
            disabled={chosenStopCount === NO_STOPS_CHOSEN}
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
                  checked={!unchosenIds.has(fulfilmentGroupId)}
                  onChange={() => toggleStop(fulfilmentGroupId)}
                />
              )}
              <span>
                Collect order #{shortOrderId(orderId)} · {itemCount} item(s)
                {readyForPickupAt ? ` · ready since ${formatRoundStart(readyForPickupAt)}` : ""}
              </span>
            </label>
          </li>
        ))}
        {returns.map(({ brandReturnId, orderId, source, unitCount }) => (
          <li key={brandReturnId}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              {canManage && (
                <Checkbox
                  checked={!unchosenIds.has(brandReturnId)}
                  onChange={() => toggleStop(brandReturnId)}
                />
              )}
              <span>
                Take back order #{shortOrderId(orderId)} · {unitCount} unit(s) ·{" "}
                {BOARD_RETURN_SOURCE_LABELS[source]}
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
          brandReturnIds={chosenReturnIds}
          onClose={() => setIsAssignOpen(false)}
        />
      )}
    </div>
  );
};
