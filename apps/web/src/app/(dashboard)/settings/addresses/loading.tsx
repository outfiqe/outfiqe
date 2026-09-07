import { Skeleton } from "@outfiqe/design-system";

const ADDRESS_ROW_COUNT = 2;

const AddressesLoading = () => (
  <div role="status" aria-label="Loading" className="max-w-xl">
    <div className="space-y-2">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3.5 w-72" />
    </div>

    <div className="mt-6 rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: ADDRESS_ROW_COUNT }).map((_, index) => (
          <Skeleton key={index} className="h-[132px] w-full rounded-2xl" />
        ))}
      </div>
    </div>
  </div>
);

export default AddressesLoading;
