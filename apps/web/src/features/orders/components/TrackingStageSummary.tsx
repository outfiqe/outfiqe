"use client";

import { ProgressBar } from "@outfiqe/design-system";
import { OrderTrackingStage } from "@outfiqe/utils";
import { useTranslations } from "next-intl";

import type { OrderTrackingStageSummary } from "../api/orderSchemas";
import { FORWARD_TRACKING_STAGES, STAGE_SHOWN_AS } from "../constants/trackingStages";

const NOT_ON_THE_WAY = -1;

type TrackingStageSummaryProps = {
  trackingStage: OrderTrackingStageSummary;
  promisedDelivery: { from: string; by: string } | null;
};

export const TrackingStageSummary = ({
  trackingStage,
  promisedDelivery,
}: TrackingStageSummaryProps) => {
  const t = useTranslations("orders.tracking");
  const { stage, collectedBrandCount, totalBrandCount } = trackingStage;
  const progressStep = FORWARD_TRACKING_STAGES.indexOf(STAGE_SHOWN_AS[stage] ?? stage);
  const lastStep = FORWARD_TRACKING_STAGES.length - 1;
  const isDelivered = stage === OrderTrackingStage.DELIVERED;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("title")}
      </p>
      <p className="font-display text-xl font-extrabold text-foreground" aria-live="polite">
        {t(`stages.${stage}`)}
      </p>
      {progressStep !== NOT_ON_THE_WAY && (
        <ProgressBar value={progressStep} max={lastStep} label={t(`stages.${stage}`)} />
      )}
      {stage === OrderTrackingStage.COLLECTING_ITEMS && (
        <p className="text-sm text-muted-foreground">
          {t("collectedBrands", { collected: collectedBrandCount, total: totalBrandCount })}
        </p>
      )}
      {promisedDelivery && !isDelivered && (
        <p className="text-sm text-muted-foreground">
          {t("promise", { from: promisedDelivery.from, by: promisedDelivery.by })}
        </p>
      )}
    </div>
  );
};
