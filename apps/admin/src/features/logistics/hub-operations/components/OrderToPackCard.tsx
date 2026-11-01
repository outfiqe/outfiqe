import { Badge, Button } from "@outfiqe/design-system";
import { formatDate } from "@outfiqe/utils";
import { useState } from "react";

import type { OrderToPack, PickupAtHub } from "../api/hubOperationsSchemas";
import { PICKUP_STATUS_LABELS } from "../constants/hubOperationLabels";
import { InspectionModal } from "./InspectionModal";
import { PackParcelModal } from "./PackParcelModal";

const NO_PICKUPS = 0;
const SHORT_ORDER_ID_START = 0;
const SHORT_ORDER_ID_LENGTH = 8;

type OrderToPackCardProps = { order: OrderToPack; canManage: boolean };

export const OrderToPackCard = ({ order, canManage }: OrderToPackCardProps) => {
  const [pickupBeingInspected, setPickupBeingInspected] = useState<PickupAtHub | null>(null);
  const [isPackModalOpen, setIsPackModalOpen] = useState(false);
  const { orderId, customerName, city, paymentMethod, placedAt, pickupsAtHub, otherPickups } =
    order;
  const isEveryBagInspected = pickupsAtHub.every(({ isInspected }) => isInspected);

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-foreground">
            {customerName} · {city}
          </h2>
          <p className="text-sm text-muted-foreground">
            Order {orderId.slice(SHORT_ORDER_ID_START, SHORT_ORDER_ID_LENGTH).toUpperCase()} ·{" "}
            {paymentMethod} · placed {formatDate(placedAt)}
          </p>
        </div>
        {canManage && (
          <Button
            size="sm"
            onClick={() => setIsPackModalOpen(true)}
            disabled={!isEveryBagInspected}
          >
            Pack parcel
          </Button>
        )}
      </div>

      <ul className="mt-3 space-y-2">
        {pickupsAtHub.map((pickup) => (
          <li
            key={pickup.fulfilmentGroupId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-3 text-sm"
          >
            <div>
              <p className="font-medium text-foreground">{pickup.brandName}</p>
              <p className="text-muted-foreground">
                {pickup.items
                  .map(
                    ({ productName, sizeLabel, units }) =>
                      `${productName} · ${sizeLabel} × ${units}`,
                  )
                  .join(", ")}
              </p>
            </div>
            {pickup.isInspected ? (
              <Badge tone="positive" showDot={false}>
                Inspected
              </Badge>
            ) : (
              canManage && (
                <Button size="sm" variant="outline" onClick={() => setPickupBeingInspected(pickup)}>
                  Inspect
                </Button>
              )
            )}
          </li>
        ))}
      </ul>

      {otherPickups.length > NO_PICKUPS && (
        <p className="mt-3 text-sm text-muted-foreground">
          Other bags:{" "}
          {otherPickups
            .map(({ brandName, pickupStatus }) =>
              pickupStatus ? `${brandName} (${PICKUP_STATUS_LABELS[pickupStatus]})` : brandName,
            )
            .join(", ")}
        </p>
      )}
      {!isEveryBagInspected && (
        <p className="mt-2 text-xs text-muted-foreground">Inspect every bag before packing.</p>
      )}

      {pickupBeingInspected && (
        <InspectionModal
          pickup={pickupBeingInspected}
          onClose={() => setPickupBeingInspected(null)}
        />
      )}
      {isPackModalOpen && (
        <PackParcelModal order={order} onClose={() => setIsPackModalOpen(false)} />
      )}
    </article>
  );
};
