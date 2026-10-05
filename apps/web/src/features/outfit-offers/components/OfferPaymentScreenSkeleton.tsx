import { Skeleton } from "@outfiqe/design-system";

export const OfferPaymentScreenSkeleton = () => (
  <div role="status" aria-label="Loading" className="flex w-full flex-col items-center gap-3">
    <Skeleton className="h-6 w-48" />
    <Skeleton className="h-4 w-64" />
    <Skeleton className="h-2 w-40 rounded-full" />
  </div>
);
