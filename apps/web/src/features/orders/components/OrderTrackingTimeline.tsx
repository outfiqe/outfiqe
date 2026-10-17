"use client";

import { FormBanner, Skeleton } from "@outfiqe/design-system";
import { useTranslations } from "next-intl";

import type { OrderTrackingStageSummary } from "../api/orderSchemas";
import { useOrderLiveUpdates } from "../hooks/useOrderLiveUpdates";
import { useOrderTracking } from "../hooks/useOrderTracking";
import { TrackedParcelCard } from "./TrackedParcelCard";
import { TrackingEventList } from "./TrackingEventList";
import { TrackingStageSummary } from "./TrackingStageSummary";

type OrderTrackingTimelineProps = {
  orderId: string;
  trackingStage: OrderTrackingStageSummary;
  promisedDelivery: { from: string; by: string } | null;
};

export const OrderTrackingTimeline = ({
  orderId,
  trackingStage,
  promisedDelivery,
}: OrderTrackingTimelineProps) => {
  const t = useTranslations("orders.tracking");
  const trackingQuery = useOrderTracking(orderId);
  useOrderLiveUpdates(orderId);

  return (
    <section className="space-y-4" aria-label={t("title")}>
      <TrackingStageSummary trackingStage={trackingStage} promisedDelivery={promisedDelivery} />
      {trackingQuery.isPending && (
        <div aria-busy="true" className="space-y-2">
          <Skeleton className="h-4 w-2/3 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
        </div>
      )}
      {trackingQuery.isError && <FormBanner>{t("loadError")}</FormBanner>}
      {trackingQuery.data && (
        <>
          {trackingQuery.data.parcels.map((parcel) => (
            <TrackedParcelCard key={parcel.shipmentId} orderId={orderId} parcel={parcel} />
          ))}
          <TrackingEventList events={trackingQuery.data.events} />
        </>
      )}
    </section>
  );
};
