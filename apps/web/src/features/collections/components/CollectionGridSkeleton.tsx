import { Skeleton } from "@/design-system/components/ui/skeleton";

export const CollectionGridSkeleton = () => {
  return (
    <div
      role="status"
      aria-label="Loading collections"
      className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className="aspect-4/3 rounded-2xl" />
      ))}
    </div>
  );
};
