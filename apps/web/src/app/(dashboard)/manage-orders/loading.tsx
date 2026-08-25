import { Skeleton } from "@outfiqe/design-system";

const OrdersLoading = () => {
  return (
    <div role="status" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3.5 w-56" />
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
};

export default OrdersLoading;
