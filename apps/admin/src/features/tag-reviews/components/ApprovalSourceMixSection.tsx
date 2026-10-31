import { ProgressBar } from "@outfiqe/design-system";

import type { TagApprovalSourceValue, TagReviewMetrics } from "../api/tagReviewsSchemas";
import { METRIC_TAG_VIEW } from "../constants/metricTagViews.constants";
import {
  SOURCE_EXPLANATION,
  SOURCE_GROUP_COLUMNS,
  SOURCE_LABEL,
} from "../constants/tagReviewMetrics.constants";
import { Card, EmptyState, MetricLinkRow, MetricRow } from "./MetricsCardParts";

const NO_APPROVALS = 0;
const PERCENT_SCALE = 100;

const toShareLabel = (count: number, total: number): string =>
  `${count.toLocaleString()} · ${Math.round((count / total) * PERCENT_SCALE)}%`;

const ApprovalSourceRow = ({
  source,
  count,
  total,
}: {
  source: TagApprovalSourceValue;
  count: number;
  total: number;
}) => {
  const rowContent = {
    label: SOURCE_LABEL[source],
    detail: SOURCE_EXPLANATION[source],
    value: toShareLabel(count, total),
  };

  return (
    <div className="[&>*:first-child]:border-0">
      {count === NO_APPROVALS ? (
        <MetricRow {...rowContent} value="0" />
      ) : (
        <MetricLinkRow {...rowContent} search={{ view: METRIC_TAG_VIEW.LIVE, source }} />
      )}
      <ProgressBar
        value={count}
        max={total}
        label={`${SOURCE_LABEL[source]}: ${toShareLabel(count, total)}`}
        className="mb-2"
      />
    </div>
  );
};

export const ApprovalSourceMixSection = ({ metrics }: { metrics: TagReviewMetrics }) => {
  const { approvalSourceMix } = metrics;
  const totalApprovals = approvalSourceMix.reduce((sum, { count }) => sum + count, NO_APPROVALS);
  const countBySource = new Map(approvalSourceMix.map(({ source, count }) => [source, count]));

  return (
    <Card title="How live tags got approved" description="All time. Click a row to see those tags.">
      {totalApprovals === NO_APPROVALS ? (
        <EmptyState>No tags are live yet. This fills in once tags start going live.</EmptyState>
      ) : (
        <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
          {SOURCE_GROUP_COLUMNS.map((sourceGroups, columnIndex) => (
            <div key={columnIndex} className="space-y-4">
              {sourceGroups.map(({ title, sources }) => (
                <div key={title}>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {title}
                  </h3>
                  {sources.map((source) => (
                    <ApprovalSourceRow
                      key={source}
                      source={source}
                      count={countBySource.get(source) ?? NO_APPROVALS}
                      total={totalApprovals}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
