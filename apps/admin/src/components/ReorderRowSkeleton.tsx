import { Skeleton } from "@outfiqe/design-system";

type ReorderRowSkeletonProps = {
  hasImage?: boolean;
};

export const ReorderRowSkeleton = ({ hasImage = false }: ReorderRowSkeletonProps) => (
  <div
    className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
    aria-hidden
  >
    <Skeleton className="size-4 rounded-sm" />
    <div className="flex flex-col">
      <Skeleton className="size-7 rounded-lg" />
      <Skeleton className="mt-0 size-7 rounded-lg" />
    </div>
    {hasImage && <Skeleton className="size-14 shrink-0 rounded-lg" />}
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-1 h-5 w-72 max-w-full" />
    </div>
    <Skeleton className="h-10 w-24 rounded-lg" />
  </div>
);
