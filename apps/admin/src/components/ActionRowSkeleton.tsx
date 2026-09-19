import { Skeleton } from "@outfiqe/design-system";

const DEFAULT_ACTION_COUNT = 1;

type ActionRowSkeletonProps = {
  hasSubLine?: boolean;
  bodyLineCount?: number;
  actionCount?: number;
};

export const ActionRowSkeleton = ({
  hasSubLine = false,
  bodyLineCount = 0,
  actionCount = DEFAULT_ACTION_COUNT,
}: ActionRowSkeletonProps) => (
  <div
    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
    aria-hidden
  >
    <div>
      <Skeleton className="h-5 w-72 max-w-full" />
      {Array.from({ length: bodyLineCount }, (_unused, lineIndex) => (
        <Skeleton key={lineIndex} className="mt-1 h-5 w-64 max-w-full" />
      ))}
      {hasSubLine && <Skeleton className="h-4 w-56" />}
    </div>
    <div className="flex gap-2">
      {Array.from({ length: actionCount }, (_unused, actionIndex) => (
        <Skeleton key={actionIndex} className="h-8 w-16 rounded-lg" />
      ))}
    </div>
  </div>
);
