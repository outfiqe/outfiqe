import { Skeleton } from "@outfiqe/design-system";

const CONTACT_FIELD_COUNT = 4;

export const BrandProfileViewSkeleton = () => (
  <div role="status" aria-label="Loading profile" className="space-y-6">
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Skeleton className="h-28 w-full rounded-none sm:h-36" />
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 shrink-0 rounded-full" />
            <Skeleton className="h-8 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: CONTACT_FIELD_COUNT }).map((_, index) => (
            <div key={index} className="flex items-start gap-2.5">
              <Skeleton className="mt-0.5 size-4 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
