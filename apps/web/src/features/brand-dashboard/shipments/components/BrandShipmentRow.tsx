import { Shirt } from "lucide-react";
import Link from "next/link";

import { AppImage } from "@/shared/components/AppImage";

import type { BrandShipmentSummary } from "../api/brandFulfilmentSchemas";
import {
  badgeToneClass,
  describeShipmentStatus,
  formatShortOrderId,
} from "../utils/shipmentStatus";

type BrandShipmentRowProps = {
  shipment: BrandShipmentSummary;
};

export const BrandShipmentRow = ({ shipment }: BrandShipmentRowProps) => {
  const {
    id,
    itemCount,
    totalQty,
    firstItemImageUrl,
    firstItemProductName,
    orderId,
    orderCreatedAt,
    shipToCity,
    trackingNumber,
    cancellationRequestedAt,
  } = shipment;

  const { label: statusLabel, tone: statusTone } = describeShipmentStatus(shipment);
  const extraItemCount = itemCount - 1;
  const itemsLabel =
    extraItemCount > 0 ? `${firstItemProductName} + ${extraItemCount} more` : firstItemProductName;

  return (
    <Link
      href={`/manage-orders/${id}`}
      className="flex cursor-pointer items-center gap-4 rounded-2xl border border-border p-4 transition-colors hover:bg-muted/40"
    >
      <div className="relative flex aspect-3/4 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        {firstItemImageUrl ? (
          <AppImage src={firstItemImageUrl} alt="" fill sizes="56px" />
        ) : (
          <Shirt className="size-6 text-foreground/25" strokeWidth={1} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{itemsLabel}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {totalQty} {totalQty === 1 ? "item" : "items"} · Ship to {shipToCity}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Order {formatShortOrderId(orderId)} · {new Date(orderCreatedAt).toLocaleDateString()}
          {trackingNumber ? ` · ${trackingNumber}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${badgeToneClass(statusTone)}`}
        >
          {statusLabel}
        </span>
        {cancellationRequestedAt && (
          <span className="text-[11px] font-medium text-destructive">Cancellation requested</span>
        )}
      </div>
    </Link>
  );
};
