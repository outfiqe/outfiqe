"use client";

import { Button, FormBanner, Skeleton, toast } from "@outfiqe/design-system";
import { formatDate } from "@outfiqe/utils";
import { Shirt } from "lucide-react";
import { useState } from "react";

import { BackLink } from "@/components/BackLink";
import { AppImage } from "@/shared/components/AppImage";
import { cn } from "@/shared/lib/cn";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { HubPickupPanel } from "../../pickups/components/HubPickupPanel";
import {
  brandPayoutStatusSchema,
  type BrandShipmentDetail as BrandShipmentDetailData,
  type BrandShipmentItem,
} from "../api/brandFulfilmentSchemas";
import { useAdvanceShipment } from "../hooks/useAdvanceShipment";
import { useBrandShipment } from "../hooks/useBrandShipment";
import {
  badgeToneClass,
  canRequestCancellation,
  describeShipmentStatus,
  formatShortOrderId,
  isDeliveredByOutfiqe,
  nextShipmentStatus,
  ORDER_SUMMARY_LABEL,
  PAYMENT_STATUS_LABEL,
  unitsStillToSend,
} from "../utils/shipmentStatus";
import { MarkShipmentShippedModal } from "./MarkShipmentShippedModal";
import { RequestShipmentCancellationModal } from "./RequestShipmentCancellationModal";
import { UnavailableItemsPanel } from "./UnavailableItemsPanel";

const formatRupees = (amount: number) => `Rs. ${amount.toLocaleString()}`;

const NONE_CANCELLED = 0;
const NO_UNITS_LEFT = 0;
const VOIDED_PAYOUT_STATUS = brandPayoutStatusSchema.enum.VOIDED;

const NEXT_ACTION_LABEL = {
  PACKED: "Mark packed",
  SHIPPED: "Mark shipped",
  DELIVERED: "Mark delivered",
} as const;

type BrandShipmentDetailProps = {
  groupId: string;
};

export const BrandShipmentDetailSkeleton = () => (
  <div role="status" aria-label="Loading" className="space-y-4">
    <Skeleton className="h-8 w-40 rounded-lg" />
    <Skeleton className="h-24 w-full rounded-2xl" />
    <Skeleton className="h-40 w-full rounded-2xl" />
    <Skeleton className="h-40 w-full rounded-2xl" />
  </div>
);

type ShipTo = NonNullable<BrandShipmentDetailData["shipTo"]>;

const ShipToCard = ({ shipTo }: { shipTo: ShipTo }) => (
  <section className="rounded-2xl border border-border p-4">
    <h2 className="text-sm font-semibold text-foreground">Ship to</h2>
    <p className="mt-2 text-sm text-foreground">{shipTo.fullName}</p>
    <p className="text-sm text-muted-foreground">{shipTo.phone}</p>
    <p className="mt-1 text-sm text-muted-foreground">
      {shipTo.address}, {shipTo.city}
      {shipTo.landmark ? ` (${shipTo.landmark})` : ""}
    </p>
  </section>
);

const describeUnitsToSend = (lineItem: BrandShipmentItem): string => {
  const { sizeLabel, qty, refundedQty } = lineItem;
  const unitsToSend = unitsStillToSend(lineItem);
  if (refundedQty === NONE_CANCELLED) return `${sizeLabel} · Qty ${qty}`;
  if (unitsToSend === NO_UNITS_LEFT) return `${sizeLabel} · Qty ${qty} · Cancelled, don't send it`;
  return `${sizeLabel} · Send ${unitsToSend} of ${qty} · ${refundedQty} cancelled`;
};

const ItemsCard = ({ items }: { items: BrandShipmentDetailData["items"] }) => (
  <section className="rounded-2xl border border-border p-4">
    <h2 className="text-sm font-semibold text-foreground">Items in this shipment</h2>
    <ul className="mt-3 space-y-3">
      {items.map((lineItem) => {
        const isDiscounted = lineItem.unitPrice < lineItem.listUnitPrice;
        const isFullyCancelled = unitsStillToSend(lineItem) === NO_UNITS_LEFT;
        return (
          <li
            key={lineItem.id}
            className={cn("flex items-center gap-3", isFullyCancelled && "opacity-60")}
          >
            <div className="relative flex aspect-3/4 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
              {lineItem.imageUrl ? (
                <AppImage src={lineItem.imageUrl} alt="" fill sizes="48px" />
              ) : (
                <Shirt className="size-5 text-foreground/25" strokeWidth={1} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{lineItem.productName}</p>
              <p className="text-xs text-muted-foreground">{describeUnitsToSend(lineItem)}</p>
            </div>
            <div className="shrink-0 text-right text-sm">
              <p className="font-medium text-foreground">{formatRupees(lineItem.unitPrice)}</p>
              {isDiscounted && (
                <p className="text-xs text-muted-foreground line-through">
                  {formatRupees(lineItem.listUnitPrice)}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  </section>
);

type ShipmentActionsProps = {
  shipment: BrandShipmentDetailData;
  isAdvancing: boolean;
  onMarkPacked: () => void;
  onMarkDelivered: () => void;
  onOpenShippedModal: () => void;
  onOpenCancelModal: () => void;
};

const ShipmentActions = ({
  shipment,
  isAdvancing,
  onMarkPacked,
  onMarkDelivered,
  onOpenShippedModal,
  onOpenCancelModal,
}: ShipmentActionsProps) => {
  if (shipment.status === "CANCELLED" || shipment.status === "DELIVERED") return null;

  if (shipment.cancellationRequestedAt) {
    return (
      <FormBanner>
        Cancellation requested
        {shipment.cancellationReason ? ` — ${shipment.cancellationReason}` : ""}. Our team is
        reviewing it.
      </FormBanner>
    );
  }

  const nextStatus = nextShipmentStatus(shipment.status);

  return (
    <div className="flex flex-wrap gap-2">
      {nextStatus === "PACKED" && (
        <Button onClick={onMarkPacked} disabled={isAdvancing}>
          {NEXT_ACTION_LABEL.PACKED}
        </Button>
      )}
      {nextStatus === "SHIPPED" && (
        <Button onClick={onOpenShippedModal}>{NEXT_ACTION_LABEL.SHIPPED}</Button>
      )}
      {nextStatus === "DELIVERED" && (
        <Button onClick={onMarkDelivered} disabled={isAdvancing}>
          {NEXT_ACTION_LABEL.DELIVERED}
        </Button>
      )}
      {canRequestCancellation(shipment.status) && (
        <Button variant="outline" onClick={onOpenCancelModal}>
          Request cancellation
        </Button>
      )}
    </div>
  );
};

const PayoutCard = ({ payout }: { payout: BrandShipmentDetailData["payout"] }) => (
  <section className="rounded-2xl border border-border p-4">
    <h2 className="text-sm font-semibold text-foreground">Your payout for this shipment</h2>
    <dl className="mt-3 space-y-1.5 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Gross</dt>
        <dd className="text-foreground">{formatRupees(payout.grossAmount)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Platform fee</dt>
        <dd className="text-foreground">− {formatRupees(payout.platformFee)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Payment fee</dt>
        <dd className="text-foreground">− {formatRupees(payout.gatewayFee)}</dd>
      </div>
      <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
        <dt className="text-foreground">Net</dt>
        <dd className="text-foreground">{formatRupees(payout.netAmount)}</dd>
      </div>
    </dl>
    {payout.lines.some(({ status }) => status === VOIDED_PAYOUT_STATUS) && (
      <p className="mt-3 text-xs text-muted-foreground">
        Cancelled and refunded items aren&apos;t paid out, so they&apos;re left out of these
        amounts.
      </p>
    )}
  </section>
);

export const BrandShipmentDetail = ({ groupId }: BrandShipmentDetailProps) => {
  const { data: shipment, isPending, isError } = useBrandShipment(groupId);
  const advanceShipment = useAdvanceShipment(groupId);
  const [isShippedModalOpen, setIsShippedModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const advanceWithoutDetails = async (status: "PACKED" | "DELIVERED") => {
    try {
      await advanceShipment.mutateAsync({ status });
      toast.success(
        status === "PACKED" ? "Shipment marked as packed" : "Shipment marked as delivered",
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div>
      <BackLink href="/manage-orders">All orders</BackLink>

      <div>
        {isError ? (
          <FormBanner>We couldn&apos;t load this shipment right now. Please try again.</FormBanner>
        ) : isPending || !shipment ? (
          <BrandShipmentDetailSkeleton />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  Order {formatShortOrderId(shipment.orderId)}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Placed {formatDate(shipment.orderCreatedAt)} ·{" "}
                  {PAYMENT_STATUS_LABEL[shipment.orderPaymentStatus]} ·{" "}
                  {ORDER_SUMMARY_LABEL[shipment.orderFulfilmentSummary]}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeToneClass(
                  describeShipmentStatus(shipment).tone,
                )}`}
              >
                {describeShipmentStatus(shipment).label}
              </span>
            </div>

            {shipment.trackingNumber && (
              <p className="text-sm text-muted-foreground">
                {shipment.carrier} · {shipment.trackingNumber}
              </p>
            )}

            {isDeliveredByOutfiqe(shipment) ? (
              <HubPickupPanel
                fulfilmentGroupId={shipment.id}
                pickupStatus={shipment.pickupStatus}
                pickupCode={shipment.pickupCode}
              />
            ) : (
              <ShipmentActions
                shipment={shipment}
                isAdvancing={advanceShipment.isPending}
                onMarkPacked={() => void advanceWithoutDetails("PACKED")}
                onMarkDelivered={() => void advanceWithoutDetails("DELIVERED")}
                onOpenShippedModal={() => setIsShippedModalOpen(true)}
                onOpenCancelModal={() => setIsCancelModalOpen(true)}
              />
            )}

            {shipment.shipTo && <ShipToCard shipTo={shipment.shipTo} />}
            <ItemsCard items={shipment.items} />
            <UnavailableItemsPanel
              groupId={shipment.id}
              items={shipment.items}
              canReport={shipment.canReportUnavailable}
            />
            <PayoutCard payout={shipment.payout} />
          </div>
        )}
      </div>

      <MarkShipmentShippedModal
        groupId={groupId}
        open={isShippedModalOpen}
        onClose={() => setIsShippedModalOpen(false)}
      />
      <RequestShipmentCancellationModal
        groupId={groupId}
        open={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
      />
    </div>
  );
};
