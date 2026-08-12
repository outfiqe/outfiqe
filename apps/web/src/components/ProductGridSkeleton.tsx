import { Skeleton } from "@outfiqe/design-system";
import { cn } from "@/shared/lib/cn";

const DEFAULT_GRID_CLASS = "grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5";

interface ProductGridSkeletonProps {
  count?: number;
  className?: string;
}

export function ProductGridSkeleton({ count = 10, className }: ProductGridSkeletonProps) {
  return (
    <div role="status" aria-label="Loading products" className={cn(DEFAULT_GRID_CLASS, className)}>
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-4/5 rounded-2xl" />
      <Skeleton className="mt-3 h-2.5 w-2/3" />
      <Skeleton className="mt-2 h-4 w-4/5" />
      <Skeleton className="mt-1.5 h-4 w-1/3" />
    </div>
  );
}
