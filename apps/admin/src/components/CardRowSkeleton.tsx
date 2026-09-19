import { Skeleton } from "@outfiqe/design-system";

const NO_ITEMS = 0;
const CARD_ROW_CLASS = "rounded-xl border border-border bg-card p-4";

const ACTION_SIZE_CLASS = {
  small: "h-8 w-20",
  regular: "h-10 w-24",
} as const;

type CardRowSkeletonProps = {
  hasBadge?: boolean;
  textLineCount?: number;
  hasMetaLine?: boolean;
  actionCount?: number;
  actionSize?: keyof typeof ACTION_SIZE_CLASS;
  leadingImageClass?: string;
  hasSpacedSections?: boolean;
};

export const CardRowSkeleton = ({
  hasBadge = true,
  textLineCount = 1,
  hasMetaLine = false,
  actionCount = NO_ITEMS,
  actionSize = "small",
  leadingImageClass,
  hasSpacedSections = false,
}: CardRowSkeletonProps) => (
  <div
    className={`${CARD_ROW_CLASS} ${leadingImageClass ? "flex gap-4" : ""} ${hasSpacedSections ? "space-y-3" : ""}`}
    aria-hidden
  >
    {leadingImageClass && <Skeleton className={`${leadingImageClass} shrink-0 rounded-lg`} />}
    <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-40" />
          {hasBadge && <Skeleton className="h-5 w-16 rounded-full" />}
        </div>
        {Array.from({ length: textLineCount }, (_unused, lineIndex) => (
          <Skeleton key={lineIndex} className="mt-1 h-5 w-72 max-w-full" />
        ))}
        {hasMetaLine && <Skeleton className="mt-1 h-4 w-56" />}
      </div>
      {actionCount > NO_ITEMS && (
        <div className="flex gap-2">
          {Array.from({ length: actionCount }, (_unused, actionIndex) => (
            <Skeleton key={actionIndex} className={`${ACTION_SIZE_CLASS[actionSize]} rounded-lg`} />
          ))}
        </div>
      )}
    </div>
  </div>
);
