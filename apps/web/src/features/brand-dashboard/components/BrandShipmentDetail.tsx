"use client";

import { Button, FormBanner, Skeleton, toast } from "@outfiqe/design-system";
import { ArrowLeft, Shirt } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AppImage } from "@/shared/components/AppImage";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { BrandShipmentDetail as BrandShipmentDetailData } from "../api/brandFulfilmentSchemas";
import { useAdvanceShipment } from "../hooks/useAdvanceShipment";
import { useBrandShipment } from "../hooks/useBrandShipment";
import { MarkShipmentShippedModal } from "./MarkShipmentShippedModal";
import { RequestShipmentCancellationModal } from "./RequestShipmentCancellationModal";
import {
  badgeToneClass,
  canRequestCancellation,
  formatShortOrderId,
  nextShipmentStatus,
  ORDER_SUMMARY_LABEL,
  PAYMENT_STATUS_LABEL,
  SHIPMENT_STATUS_LABEL,
  SHIPMENT_STATUS_TONE,
} from "./shipmentStatus";

const formatRupees = (amount: number) => `Rs. ${amount.toLocaleString()}`;

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

const ShipToCard = ({ shipTo }: { shipTo: BrandShipmentDetailData["shipTo"] }) => (
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

const ItemsCard = ({ items }: { items: BrandShipmentDetailData["items"] }) => (
  <section className="rounded-2xl border border-border p-4">
    <h2 className="text-sm font-semibold text-foreground">Items in this shipment</h2>
    <ul className="mt-3 space-y-3">
      {items.map((item) => {
        const isDiscounted = item.unitPrice < item.listUnitPrice;
        return (
          <li key={item.id} className="flex items-center gap-3">
            <div className="relative flex aspect-3/4 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
              {item.imageUrl ? (
                <AppImage src={item.imageUrl} alt="" fill sizes="48px" />
              ) : (
                <Shirt className="size-5 text-foreground/25" strokeWidth={1} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{item.productName}</p>
              <p className="text-xs text-muted-foreground">
                {item.sizeLabel} · Qty {item.qty}
              </p>
            </div>
            <div className="shrink-0 text-right text-sm">
              <p className="font-medium text-foreground">{formatRupees(item.unitPrice)}</p>
              {isDiscounted && (
                <p className="text-xs text-muted-foreground line-through">
                  {formatRupees(item.listUnitPrice)}
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
  if (shipment.cancellationRequestedAt) {
    return (
      <FormBanner>
        Cancellation requested
        {shipment.cancellationReason ? ` — ${shipment.cancellationReason}` : ""}. Our team is
        reviewing it.
      </FormBanner>
    );
  }
  if (shipment.status === "CANCELLED" || shipment.status === "DELIVERED") return null;

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
      <Link
        href="/manage-orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All orders
      </Link>

      <div className="mt-4">
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
                  Placed {new Date(shipment.orderCreatedAt).toLocaleDateString()} ·{" "}
                  {PAYMENT_STATUS_LABEL[shipment.orderPaymentStatus]} ·{" "}
                  {ORDER_SUMMARY_LABEL[shipment.orderFulfilmentSummary]}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeToneClass(
                  SHIPMENT_STATUS_TONE[shipment.status],
                )}`}
              >
                {SHIPMENT_STATUS_LABEL[shipment.status]}
              </span>
            </div>

            {shipment.trackingNumber && (
              <p className="text-sm text-muted-foreground">
                {shipment.carrier} · {shipment.trackingNumber}
              </p>
            )}

            <ShipmentActions
              shipment={shipment}
              isAdvancing={advanceShipment.isPending}
              onMarkPacked={() => void advanceWithoutDetails("PACKED")}
              onMarkDelivered={() => void advanceWithoutDetails("DELIVERED")}
              onOpenShippedModal={() => setIsShippedModalOpen(true)}
              onOpenCancelModal={() => setIsCancelModalOpen(true)}
            />

            <ShipToCard shipTo={shipment.shipTo} />
            <ItemsCard items={shipment.items} />
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
