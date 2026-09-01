import { FormBanner, Skeleton } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";

import { getErrorMessage } from "@/lib/errorMessages";

import { platformMetricsApi } from "./api";
import type { TenantSparklinePoint } from "./schemas";

const SPARK_WIDTH = 320;
const SPARK_HEIGHT = 48;

const Sparkline = ({ points }: { points: TenantSparklinePoint[] }) => {
  if (points.length < 2) {
    return <p className="text-sm text-muted-foreground">Not enough history yet for a trend.</p>;
  }

  const values = points.map((point) => point.activityCount);
  const max = Math.max(...values, 1);
  const step = SPARK_WIDTH / (points.length - 1);
  const path = values
    .map((value, index) => {
      const x = index * step;
      const y = SPARK_HEIGHT - (value / max) * SPARK_HEIGHT;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      className="h-12 w-full max-w-sm"
      role="img"
      aria-label="Activity per day over the recorded window"
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth={2} className="text-primary" />
    </svg>
  );
};

const Metric = ({ label, value }: { label: string; value: string | number }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-lg font-semibold text-foreground">{value}</p>
  </div>
);

export const TenantMetricsDetailPage = () => {
  const { orgId } = useParams({ from: "/_authenticated/platform/metrics/$orgId" });

  const detail = useQuery({
    queryKey: ["platform-metrics-tenant", orgId],
    queryFn: () => platformMetricsApi.getTenantDetail(orgId),
  });

  return (
    <div>
      <Link to="/platform/metrics" className="text-sm text-primary-strong underline">
        ← All tenants
      </Link>

      {detail.isLoading && <Skeleton className="mt-4 h-40 w-full" />}
      {detail.error && <FormBanner className="mt-4">{getErrorMessage(detail.error)}</FormBanner>}

      {detail.data && (
        <div className="mt-4">
          <h1 className="font-display text-2xl font-bold text-foreground">{detail.data.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {detail.data.subdomain} · {detail.data.plan}
            {detail.data.subscriptionStatus
              ? ` (${detail.data.subscriptionStatus.toLowerCase()})`
              : ""}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Members" value={detail.data.memberCount} />
            <Metric label="Contacts" value={detail.data.contactCount} />
            <Metric label="Deals" value={detail.data.dealCount} />
            <Metric label="Tickets" value={detail.data.ticketCount} />
            <Metric label="Activities" value={detail.data.activityCount} />
            <Metric label="Partners" value={detail.data.partnerCount} />
            <Metric label="Customers" value={detail.data.customerCount} />
            <Metric
              label="Last activity"
              value={
                detail.data.lastCrmActivityAt
                  ? new Date(detail.data.lastCrmActivityAt).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })
                  : "—"
              }
            />
          </div>

          <div className="mt-8">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Activity trend</p>
            <div className="mt-2">
              <Sparkline points={detail.data.series} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
