import { Skeleton } from "@outfiqe/design-system";

const TENANT_METRIC_SKELETON_COUNT = 8;

export const TenantMetricsSkeleton = () => (
  <div role="status" aria-label="Loading">
    <span className="text-sm text-primary-strong underline">← All tenants</span>
    <div className="mt-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-1 h-5 w-48" />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: TENANT_METRIC_SKELETON_COUNT }, (_unused, metricIndex) => (
          <div key={metricIndex}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-0.5 h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="mt-8">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Activity trend</p>
        <div className="mt-2 max-w-sm">
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);
