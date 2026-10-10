import { useQuery } from "@tanstack/react-query";

import { tagReviewsApi } from "../api/tagReviewsApi";
import { ApprovalSourceMixSection } from "./ApprovalSourceMixSection";
import { DetailSections, FunnelSpeedSection } from "./MetricsDetailSections";
import { InsightBanner, OverviewStrip } from "./MetricsOverviewStrip";
import { TagReviewMetricsSkeleton } from "./TagReviewMetricsSkeleton";

export const TagReviewMetricsPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tag-review-metrics"],
    queryFn: tagReviewsApi.metrics,
  });

  if (isLoading) {
    return <TagReviewMetricsSkeleton />;
  }
  if (error || !data) {
    return <p className="text-sm text-destructive">Couldn&apos;t load tag review metrics.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Tag reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How the Brand Tag Review funnel is running across every brand. All-time unless noted.
        </p>
      </div>

      <InsightBanner data={data} />
      <OverviewStrip data={data} />
      <ApprovalSourceMixSection data={data} />
      <FunnelSpeedSection data={data} />
      <DetailSections data={data} />
    </div>
  );
};
