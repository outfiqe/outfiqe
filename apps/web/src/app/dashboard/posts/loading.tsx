import { Skeleton } from "@/design-system/components/ui/skeleton";

export default function PostsLoading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <Skeleton className="h-11 w-32 rounded-full" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="aspect-[4/5] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
