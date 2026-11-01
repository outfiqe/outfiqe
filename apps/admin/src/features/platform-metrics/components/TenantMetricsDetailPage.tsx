import { Badge, Button, FormBanner, StatCard } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { BackLink } from "@/components/BackLink";
import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { getErrorMessage } from "@/lib/errorMessages";

import { platformMetricsApi } from "../api/platformMetricsApi";
import type { TenantMetricDetail } from "../api/platformMetricsSchemas";
import {
  TENANT_COUNT_CARDS,
  VIEW_AS_SUPPORT_PERMISSIONS,
} from "../constants/tenantMetrics.constants";
import {
  describeTenantUsage,
  toPlanLabel,
  toSubscriptionLabel,
  toTenantSiteUrl,
} from "../utils/tenantMetrics.utils";
import { TenantAccountSection } from "./TenantAccountSection";
import { TenantActivitySection } from "./TenantActivitySection";
import { TenantMetricsSkeleton } from "./TenantMetricsSkeleton";

const TenantHeader = ({ tenant }: { tenant: TenantMetricDetail }) => {
  const { canUse } = usePlatformPermissions();
  const { organizationId, name, subdomain, plan, subscriptionStatus } = tenant;
  const statusLabel = toSubscriptionLabel(subscriptionStatus);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold text-foreground">{name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone="neutral" showDot={false}>
            {toPlanLabel(plan)}
          </Badge>
          {statusLabel && (
            <Badge tone="neutral" showDot={false}>
              {statusLabel}
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">{subdomain}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{describeTenantUsage(tenant)}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={toTenantSiteUrl(subdomain)} target="_blank" rel="noreferrer">
            Open their site
            <ExternalLink aria-hidden="true" />
          </a>
        </Button>
        {canUse(...VIEW_AS_SUPPORT_PERMISSIONS) && (
          <Button asChild size="sm">
            <Link to="/platform/impersonation" search={{ org: organizationId }}>
              View as support
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};

const TenantCounts = ({ tenant }: { tenant: TenantMetricDetail }) => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {TENANT_COUNT_CARDS.map(({ label, metricKey, hint }) => (
      <StatCard key={label} label={label} value={tenant[metricKey].toLocaleString()} hint={hint} />
    ))}
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
      <BackLink to="/platform/metrics">All tenants</BackLink>

      {detail.isLoading && <TenantMetricsSkeleton />}
      {detail.error && <FormBanner className="mt-4">{getErrorMessage(detail.error)}</FormBanner>}

      {detail.data && (
        <div className="space-y-5">
          <TenantHeader tenant={detail.data} />
          <TenantCounts tenant={detail.data} />
          <TenantActivitySection points={detail.data.series} />
          <TenantAccountSection tenant={detail.data} />
          <p className="text-xs text-muted-foreground">
            These are counts only. To help this business with a problem, use View as support, which
            is time-limited and logged.
          </p>
        </div>
      )}
    </div>
  );
};
