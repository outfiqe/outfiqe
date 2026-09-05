import { Skeleton } from "@outfiqe/design-system";

const ShareTargetLoading = () => {
  return (
    <div role="status" aria-label="Loading">
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-10">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-8 w-48" />
      </div>
    </div>
  );
};

export default ShareTargetLoading;
