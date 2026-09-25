import { Skeleton } from "@outfiqe/design-system";

const PLACEHOLDER_REQUEST_COUNT = 3;

export const SupportRequestsSkeleton = () => (
  <div role="status" aria-label="Loading your support requests" className="space-y-2.5">
    {Array.from({ length: PLACEHOLDER_REQUEST_COUNT }, (_, index) => (
      <Skeleton key={index} className="h-16 w-full rounded-xl" />
    ))}
  </div>
);
