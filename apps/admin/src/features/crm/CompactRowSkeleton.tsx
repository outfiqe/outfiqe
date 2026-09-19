import { Skeleton } from "@outfiqe/design-system";

const COMPACT_ROW_COUNT = 5;

type CompactRowSkeletonProps = {
  hasCheckbox?: boolean;
  hasTrailingBadge?: boolean;
};

export const CompactRowSkeleton = ({
  hasCheckbox = false,
  hasTrailingBadge = false,
}: CompactRowSkeletonProps) => (
  <ul className="space-y-2" aria-hidden>
    {Array.from({ length: COMPACT_ROW_COUNT }, (_unused, rowIndex) => (
      <li
        key={rowIndex}
        className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
      >
        <span className="flex items-center gap-2">
          {hasCheckbox && <Skeleton className="size-4 rounded-sm" />}
          <Skeleton className="h-5 w-56" />
        </span>
        <span className="flex items-center gap-2">
          <Skeleton className="h-4 w-44" />
          {hasTrailingBadge && <Skeleton className="h-5 w-16 rounded-full" />}
        </span>
      </li>
    ))}
  </ul>
);
