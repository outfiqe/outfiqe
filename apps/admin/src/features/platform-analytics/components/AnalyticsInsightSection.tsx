import { Skeleton } from "@outfiqe/design-system";
import { formatDateTime } from "@outfiqe/utils";
import type { UseQueryResult } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { type ReactNode, useId } from "react";

import { INSIGHT_MESSAGE, OPEN_IN_POSTHOG_LABEL } from "../constants/platformAnalytics.constants";

type InsightQueryData<Insight> = {
  status: "fresh" | "stale" | "not_connected" | "unavailable";
  refreshedAt: string | null;
  posthogUrl: string | null;
  insight: Insight | null;
};

type AnalyticsInsightSectionProps<Insight> = {
  sectionId: string;
  title: string;
  description: string;
  insightQuery: UseQueryResult<InsightQueryData<Insight>>;
  children: (insight: Insight) => ReactNode;
};

const SectionMessage = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-muted-foreground">{children}</p>
);

const formatRefreshedAt = (refreshedAt: string | null): string =>
  refreshedAt ? ` (from ${formatDateTime(refreshedAt)})` : "";

export const AnalyticsInsightSection = <Insight,>({
  sectionId,
  title,
  description,
  insightQuery,
  children,
}: AnalyticsInsightSectionProps<Insight>) => {
  const headingId = useId();
  const { data: insightResult, isLoading, isError } = insightQuery;

  const renderBody = (): ReactNode => {
    if (isLoading) {
      return (
        <div aria-busy="true" className="space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }
    if (isError || !insightResult)
      return <SectionMessage>{INSIGHT_MESSAGE.REQUEST_FAILED}</SectionMessage>;
    if (insightResult.status === "not_connected") {
      return <SectionMessage>{INSIGHT_MESSAGE.NOT_CONNECTED}</SectionMessage>;
    }
    if (insightResult.status === "unavailable" || !insightResult.insight) {
      return <SectionMessage>{INSIGHT_MESSAGE.UNAVAILABLE}</SectionMessage>;
    }
    return (
      <>
        {insightResult.status === "stale" && (
          <p role="status" className="mb-3 text-xs font-medium text-muted-foreground">
            {`${INSIGHT_MESSAGE.STALE}${formatRefreshedAt(insightResult.refreshedAt)}.`}
          </p>
        )}
        {children(insightResult.insight)}
        {insightResult.status === "fresh" && insightResult.refreshedAt && (
          <p className="mt-3 text-xs text-muted-foreground">
            {`Updated ${formatDateTime(insightResult.refreshedAt)}`}
          </p>
        )}
      </>
    );
  };

  return (
    <section
      id={sectionId}
      aria-labelledby={headingId}
      className="scroll-mt-24 rounded-2xl border border-border bg-card p-5"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={headingId} className="font-display text-lg font-bold text-foreground">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        {insightResult?.posthogUrl && (
          <a
            href={insightResult.posthogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {OPEN_IN_POSTHOG_LABEL}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
      </div>
      {renderBody()}
    </section>
  );
};
