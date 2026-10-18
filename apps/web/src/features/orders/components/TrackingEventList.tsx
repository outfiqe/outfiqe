"use client";

import { useLocale, useTranslations } from "next-intl";

import { formatNepalDateTime } from "@/shared/lib/nepalFormatting";

import type { CustomerTrackingEvent } from "../api/trackingSchemas";
import { DELIVERY_FAILED_EVENT_CODE } from "../constants/trackingStages";

const NO_EVENTS = 0;

type TrackingEventListProps = { events: CustomerTrackingEvent[] };

export const TrackingEventList = ({ events }: TrackingEventListProps) => {
  const t = useTranslations("orders.tracking");
  const locale = useLocale();

  if (events.length === NO_EVENTS) {
    return <p className="text-sm text-muted-foreground">{t("noEvents")}</p>;
  }

  return (
    <ol className="space-y-3 border-l border-border pl-4">
      {events.map(({ id, code, occurredAt, brandName, location, reasonCode }) => (
        <li key={id} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-primary"
          />
          <p className="text-sm font-medium text-foreground">{t(`events.${code}`)}</p>
          {code === DELIVERY_FAILED_EVENT_CODE && reasonCode && (
            <p className="text-sm text-muted-foreground">{t(`failureReasons.${reasonCode}`)}</p>
          )}
          <p className="text-xs text-muted-foreground">
            <time dateTime={occurredAt}>{formatNepalDateTime(occurredAt, locale)}</time>
            {brandName ? ` · ${brandName}` : ""}
            {location ? ` · ${location}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
};
