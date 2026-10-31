import { Button, FilterChip, Skeleton } from "@outfiqe/design-system";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, X } from "lucide-react";
import { useState } from "react";

import { DEFAULT_SKELETON_ROW_COUNT } from "@/lib/skeletons";

import type { MetricTag } from "../api/tagReviewsSchemas";
import {
  METRIC_TAG_VIEW_COPY,
  METRIC_TAG_VIEW_ORDER,
  type MetricTagsSearch,
} from "../constants/metricTagViews.constants";
import { POLICY_LABEL, REASON_LABEL, SOURCE_LABEL } from "../constants/tagReviewMetrics.constants";
import { useInfiniteMetricTags } from "../hooks/useInfiniteMetricTags";
import { toMetricTagsSearch } from "../utils/metricTagsSearch.utils";
import { pluralize } from "../utils/tagReviewMetrics.utils";
import { EmptyState } from "./MetricsCardParts";
import { MetricTagDrawer } from "./MetricTagDrawer";
import { MetricTagRow } from "./MetricTagRow";

const FIRST_PAGE_INDEX = 0;

const describeNarrowing = ({ source, reason, policy }: MetricTagsSearch): string | null => {
  if (source) return SOURCE_LABEL[source];
  if (reason) return REASON_LABEL[reason];
  if (policy) return POLICY_LABEL[policy];
  return null;
};

const MetricTagRowsSkeleton = () => (
  <div className="space-y-2" role="status" aria-label="Loading tags">
    {Array.from({ length: DEFAULT_SKELETON_ROW_COUNT }, (_unused, index) => (
      <Skeleton key={index} className="h-[90px] w-full rounded-xl" />
    ))}
  </div>
);

export const TagReviewTagsPage = () => {
  const search = toMetricTagsSearch(useSearch({ strict: false }));
  const navigate = useNavigate();
  const [openTag, setOpenTag] = useState<MetricTag | null>(null);
  const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteMetricTags(search);

  const metricTags = data?.pages.flatMap(({ items }) => items) ?? [];
  const totalCount = data?.pages[FIRST_PAGE_INDEX]?.totalCount;
  const { view } = search;
  const { title, description, emptyMessage } = METRIC_TAG_VIEW_COPY[view];
  const narrowing = describeNarrowing(search);

  const showView = (nextSearch: MetricTagsSearch) =>
    void navigate({ to: "/tag-reviews/tags", search: nextSearch, replace: true });

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/tag-reviews"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Tag reviews
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {METRIC_TAG_VIEW_ORDER.map((metricView) => (
          <FilterChip
            key={metricView}
            isSelected={metricView === view}
            onClick={() => showView({ view: metricView })}
          >
            {METRIC_TAG_VIEW_COPY[metricView].chip}
          </FilterChip>
        ))}
      </div>

      <div className="flex min-h-8 flex-wrap items-center gap-3">
        {totalCount !== undefined && (
          <p className="text-sm font-medium text-foreground" aria-live="polite">
            {pluralize(totalCount, "tag")}
          </p>
        )}
        {narrowing && (
          <Button variant="outline" onClick={() => showView({ view })}>
            Only: {narrowing}
            <X className="size-4" aria-hidden />
            <span className="sr-only">Show all</span>
          </Button>
        )}
      </div>

      {isLoading && <MetricTagRowsSkeleton />}
      {error && <p className="text-sm text-destructive">Couldn&apos;t load these tags.</p>}
      {!isLoading && !error && metricTags.length === 0 && <EmptyState>{emptyMessage}</EmptyState>}

      {metricTags.length > 0 && (
        <ul className="space-y-2">
          {metricTags.map((metricTag) => (
            <li key={metricTag.id}>
              <MetricTagRow tag={metricTag} onOpen={() => setOpenTag(metricTag)} />
            </li>
          ))}
        </ul>
      )}

      {hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void fetchNextPage()}
          isLoading={isFetchingNextPage}
          className="mx-auto"
        >
          Load more
        </Button>
      )}

      {openTag && <MetricTagDrawer tag={openTag} onClose={() => setOpenTag(null)} />}
    </div>
  );
};
