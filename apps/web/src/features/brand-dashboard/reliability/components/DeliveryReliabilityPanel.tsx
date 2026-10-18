"use client";

import { Badge, Button, Skeleton } from "@outfiqe/design-system";

import { formatNepalDateTime } from "@/shared/lib/nepalFormatting";

import type { ReliabilityLevel } from "../api/reliabilitySchemas";
import { BRAND_INCIDENT_LABELS, RELIABILITY_LEVEL_MESSAGES } from "../constants/reliabilityLabels";
import { useDeliveryReliability } from "../hooks/useDeliveryReliability";

const NO_INCIDENTS = 0;
const ENGLISH_LOCALE = "en";

const LEVEL_TONES: Record<ReliabilityLevel, "positive" | "neutral" | "negative"> = {
  GOOD: "positive",
  WARNING: "neutral",
  REVIEW: "negative",
};

type DeliveryReliabilityPanelProps = {
  isOrderLogisticsOn: boolean;
};

export const DeliveryReliabilityPanel = ({ isOrderLogisticsOn }: DeliveryReliabilityPanelProps) => {
  const { data, isPending, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useDeliveryReliability();
  const [firstPage] = data?.pages ?? [];
  const incidents = data?.pages.flatMap((page) => page.incidents) ?? [];

  if (isError) return null;
  if (isPending || !firstPage) {
    return isOrderLogisticsOn ? (
      <Skeleton className="mt-6 h-20 w-full rounded-2xl" aria-label="Loading reliability" />
    ) : null;
  }

  const { incidentCount, windowDays, level, warningAt } = firstPage;
  if (!isOrderLogisticsOn && incidentCount === NO_INCIDENTS) return null;

  return (
    <section
      aria-labelledby="delivery-reliability-heading"
      className="mt-6 rounded-2xl border border-border p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="delivery-reliability-heading"
          className="font-display text-sm font-bold uppercase tracking-wide text-foreground"
        >
          Delivery reliability
        </h2>
        <Badge tone={LEVEL_TONES[level]} showDot={false}>
          {incidentCount} in the last {windowDays} days
        </Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {RELIABILITY_LEVEL_MESSAGES[level]} Missing items, failed quality checks and rider visits
        with nothing ready count here; you get a warning at {warningAt}.
      </p>

      {incidentCount === NO_INCIDENTS ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No problems in the last {windowDays} days.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {incidents.map(({ id, kind, note, occurredAt }) => (
            <li key={id} className="py-2">
              <p className="text-sm font-medium text-foreground">{BRAND_INCIDENT_LABELS[kind]}</p>
              <p className="text-xs text-muted-foreground">
                <time dateTime={occurredAt}>{formatNepalDateTime(occurredAt, ENGLISH_LOCALE)}</time>
                {note ? ` · ${note}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      {hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void fetchNextPage()}
          isLoading={isFetchingNextPage}
        >
          Show more
        </Button>
      )}
    </section>
  );
};
