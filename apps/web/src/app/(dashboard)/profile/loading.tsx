import { Skeleton } from "@outfiqe/design-system";

const DashboardProfileLoading = () => (
  <div role="status" aria-label="Loading profile" className="space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="size-16 shrink-0 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
    <Skeleton className="h-48 w-full rounded-2xl" />
  </div>
);

export default DashboardProfileLoading;
