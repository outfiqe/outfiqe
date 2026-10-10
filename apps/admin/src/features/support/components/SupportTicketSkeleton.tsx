import { Skeleton } from "@outfiqe/design-system";

import { SkeletonBadge } from "@/components/SkeletonControls";

const TICKET_MESSAGE_SKELETON_COUNT = 3;
const TICKET_SIDE_CARD_SKELETON_COUNT = 2;

export const SupportTicketSkeleton = () => (
  <div className="space-y-5" role="status" aria-label="Loading">
    <Skeleton className="h-5 w-24" />
    <div className="flex flex-wrap items-center gap-2">
      <Skeleton className="h-4 w-20" />
      <SkeletonBadge />
      <SkeletonBadge />
    </div>
    <Skeleton className="h-8 w-96 max-w-full" />

    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="space-y-3">
        {Array.from({ length: TICKET_MESSAGE_SKELETON_COUNT }, (_unused, messageIndex) => (
          <div key={messageIndex} className="rounded-xl border border-border bg-card p-3.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-5 w-full" />
            <Skeleton className="mt-1 h-5 w-2/3" />
          </div>
        ))}
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      <aside className="space-y-4">
        {Array.from({ length: TICKET_SIDE_CARD_SKELETON_COUNT }, (_unused, cardIndex) => (
          <Skeleton key={cardIndex} className="h-32 w-full rounded-xl" />
        ))}
      </aside>
    </div>
  </div>
);
