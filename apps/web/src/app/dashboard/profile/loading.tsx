import { Skeleton } from "@outfiqe/design-system";

const ProfileLoading = () => {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3.5 w-52" />
        </div>
      </div>
      <Skeleton className="mt-5 h-6 w-36 rounded-full" />
    </div>
  );
};

export default ProfileLoading;
