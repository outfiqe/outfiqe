import { Skeleton } from "@outfiqe/design-system";

import { SkeletonBadge, SkeletonButton } from "./SkeletonControls";

const NO_ITEMS = 0;
const CHIP_COUNT = 3;
const CARD_ROW_CLASS = "rounded-xl border border-border bg-card p-4";

const ACTION_LABELS = ["Edit", "Archive", "Delete", "Details"];
const ACTION_SIZES = { small: "sm", regular: "default" } as const;

type CardRowSkeletonProps = {
  hasBadge?: boolean;
  textLineCount?: number;
  hasMetaLine?: boolean;
  actionCount?: number;
  actionSize?: keyof typeof ACTION_SIZES;
  leadingImageClass?: string;
  hasSpacedSections?: boolean;
  hasChipRow?: boolean;
  hasSmallTitle?: boolean;
};

export const CardRowSkeleton = ({
  hasBadge = true,
  textLineCount = 1,
  hasMetaLine = false,
  actionCount = NO_ITEMS,
  actionSize = "small",
  leadingImageClass,
  hasSpacedSections = false,
  hasChipRow = false,
  hasSmallTitle = false,
}: CardRowSkeletonProps) => (
  <div
    className={`${CARD_ROW_CLASS} ${leadingImageClass ? "flex gap-4" : ""} ${hasSpacedSections ? "space-y-3" : ""}`}
    aria-hidden
  >
    {leadingImageClass && <Skeleton className={`${leadingImageClass} shrink-0 rounded-lg`} />}
    <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <Skeleton className={hasSmallTitle ? "h-5 w-40" : "h-6 w-40"} />
          {hasBadge && <SkeletonBadge />}
        </div>
        {Array.from({ length: textLineCount }, (_unused, lineIndex) => (
          <Skeleton key={lineIndex} className="mt-1 h-5 w-72 max-w-full" />
        ))}
        {hasMetaLine && <Skeleton className="mt-1 h-4 w-56" />}
        {hasChipRow && (
          <div className="mt-2 flex gap-1.5">
            {Array.from({ length: CHIP_COUNT }, (_unused, chipIndex) => (
              <Skeleton key={chipIndex} className="h-6 w-16 rounded-full" />
            ))}
          </div>
        )}
      </div>
      {actionCount > NO_ITEMS && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: actionCount }, (_unused, actionIndex) => (
            <SkeletonButton
              key={actionIndex}
              size={ACTION_SIZES[actionSize]}
              label={ACTION_LABELS[actionIndex % ACTION_LABELS.length]}
            />
          ))}
        </div>
      )}
    </div>
  </div>
);
