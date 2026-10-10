import { BarSeries, ChartCard } from "@outfiqe/design-system";

import type { TagReviewMetrics } from "../api/tagReviewsSchemas";
import {
  APPROVAL_MIX_CATEGORY_KEY,
  AUTO_SOURCES,
  LEGACY_APPROVAL_HINT,
  SLA_LAPSED_HINT,
  SOURCE_LABEL,
} from "../constants/tagReviewMetrics.constants";
import { JargonHint, Row } from "./MetricsCardParts";

export const ApprovalSourceMixSection = ({ data }: { data: TagReviewMetrics }) => {
  const totalApprovals = data.approvalSourceMix.reduce((sum, row) => sum + row.count, 0);
  const manualCount = data.approvalSourceMix.find((row) => row.source === "BRAND")?.count ?? 0;
  const legacyCount =
    data.approvalSourceMix.find((row) => row.source === "GRANDFATHERED")?.count ?? 0;
  const autoRows = data.approvalSourceMix.filter((row) =>
    (AUTO_SOURCES as readonly string[]).includes(row.source),
  );
  const autoCount = autoRows.reduce((sum, row) => sum + row.count, 0);

  const chartData = [
    {
      [APPROVAL_MIX_CATEGORY_KEY]: "Approvals",
      manual: manualCount,
      automatic: autoCount,
      legacy: legacyCount,
    },
  ];

  return (
    <div>
      <ChartCard
        title="Approval source mix"
        description="How live tags got approved — manual review, automatic rules, or legacy approval."
        isEmpty={totalApprovals === 0}
        emptyMessage="No approvals yet — this fills in once brands or the auto-approval rules start deciding tags."
        dataTable={
          <table>
            <caption>Approval source breakdown</caption>
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col">Count</th>
              </tr>
            </thead>
            <tbody>
              {data.approvalSourceMix.map((row) => (
                <tr key={row.source}>
                  <td>{SOURCE_LABEL[row.source]}</td>
                  <td>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <BarSeries
          data={chartData}
          categoryKey={APPROVAL_MIX_CATEGORY_KEY}
          orientation="bar"
          stacked
          height={120}
          series={[
            { dataKey: "manual", label: "Manual review" },
            { dataKey: "automatic", label: "Automatic" },
            { dataKey: "legacy", label: "Legacy approval" },
          ]}
          showLegend
        />
      </ChartCard>

      {(autoCount > 0 || legacyCount > 0) && (
        <div className="mt-3 rounded-xl border border-border bg-card p-4">
          {autoCount > 0 && (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Automatic breakdown
              </p>
              {autoRows.map((row) => (
                <Row
                  key={row.source}
                  label={
                    row.source === "SLA" ? (
                      <span className="inline-flex items-center gap-1">
                        {SOURCE_LABEL[row.source]}
                        <JargonHint term="SLA lapsed">{SLA_LAPSED_HINT}</JargonHint>
                      </span>
                    ) : (
                      SOURCE_LABEL[row.source]
                    )
                  }
                  value={String(row.count)}
                />
              ))}
            </>
          )}
          {legacyCount > 0 && (
            <Row
              label={
                <span className="inline-flex items-center gap-1">
                  Legacy approval
                  <JargonHint term="Legacy approval">{LEGACY_APPROVAL_HINT}</JargonHint>
                </span>
              }
              value={String(legacyCount)}
            />
          )}
        </div>
      )}
    </div>
  );
};
