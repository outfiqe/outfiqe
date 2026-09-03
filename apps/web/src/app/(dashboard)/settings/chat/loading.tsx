import { Skeleton } from "@outfiqe/design-system";

const BLOCKED_CONTACT_ROW_COUNT = 3;

const ChatSettingsLoading = () => (
  <div role="status" aria-label="Loading" className="max-w-xl">
    <div className="space-y-2">
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-3.5 w-64" />
    </div>

    <div className="mt-6 space-y-6">
      <Skeleton className="h-[72px] w-full rounded-2xl" />

      <div>
        <Skeleton className="h-4 w-56" />
        <Skeleton className="mt-2 h-3 w-full max-w-sm" />
        <Skeleton className="mt-3 h-10 w-full rounded-xl" />
      </div>

      <div>
        <Skeleton className="h-4 w-48" />
        <div className="mt-2 divide-y divide-border">
          {Array.from({ length: BLOCKED_CONTACT_ROW_COUNT }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 py-2">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default ChatSettingsLoading;
