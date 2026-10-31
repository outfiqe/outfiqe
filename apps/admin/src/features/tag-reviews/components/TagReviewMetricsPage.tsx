import { useQuery } from "@tanstack/react-query";

import { tagReviewsApi } from "../api/tagReviewsApi";
import { ApprovalSourceMixSection } from "./ApprovalSourceMixSection";
import { DetailSections, FunnelSpeedSection } from "./MetricsDetailSections";
import { InsightBanner, OverviewStrip } from "./MetricsOverviewStrip";
import { TagReviewMetricsSkeleton } from "./TagReviewMetricsSkeleton";

export const TagReviewMetricsPage = () => {
  const {
    data: metrics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tag-review-metrics"],
    queryFn: tagReviewsApi.metrics,
  });

  if (isLoading) {
    return <TagReviewMetricsSkeleton />;
  }
  if (error || !metrics) {
    return <p className="text-sm text-destructive">Couldn&apos;t load tag review metrics.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Tag reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          When a muse tags a product, the brand may need to approve it before shoppers can use it.
          This page shows how that is going. Click any number to see the tags behind it.
        </p>
      </div>

      <InsightBanner metrics={metrics} />
      <OverviewStrip metrics={metrics} />
      <DetailSections metrics={metrics} />
      <FunnelSpeedSection metrics={metrics} />
      <ApprovalSourceMixSection metrics={metrics} />
    </div>
  );
};
