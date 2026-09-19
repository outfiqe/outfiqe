import { Skeleton } from "@outfiqe/design-system";

import { SkeletonBadge, SkeletonButton } from "./SkeletonControls";

type ReportRowSkeletonProps = {
  hasLeadingName?: boolean;
};

export const ReportRowSkeleton = ({ hasLeadingName = false }: ReportRowSkeletonProps) => (
  <div className="flex gap-4 rounded-xl border border-border bg-card p-4" aria-hidden>
    <Skeleton className="size-20 shrink-0 rounded-lg" />
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        {hasLeadingName && <Skeleton className="h-5 w-32" />}
        <SkeletonBadge label="Reason" />
        <SkeletonBadge label="Reported post" />
      </div>
      <Skeleton className="mt-1 h-4 w-72 max-w-full" />
      <Skeleton className="mt-1.5 h-5 w-full max-w-md" />
      <SkeletonButton label="Resolve" className="mt-2.5" />
    </div>
  </div>
);
