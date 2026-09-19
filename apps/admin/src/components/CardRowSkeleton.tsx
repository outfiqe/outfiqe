import { Skeleton } from "@outfiqe/design-system";

import { SkeletonBadge, SkeletonButton } from "./SkeletonControls";

const NO_ITEMS = 0;
const CHIP_COUNT = 3;
const CARD_ROW_CLASS = "rounded-xl border border-border bg-card p-4";

const SELECT_ACTION_CLASS = "h-11 w-40 rounded-lg";

export type SkeletonAction = {
  label: string;
  size?: "default" | "sm";
  variant?: "default" | "outline" | "ghost";
};

type CardRowSkeletonProps = {
  hasBadge?: boolean;
  textLineCount?: number;
  hasMetaLine?: boolean;
  actions?: readonly SkeletonAction[];
  hasSelectAction?: boolean;
  hasTrailingBadge?: boolean;
  leadingImageClass?: string;
  hasSpacedSections?: boolean;
  hasChipRow?: boolean;
  hasSmallTitle?: boolean;
};

export const CardRowSkeleton = ({
  hasBadge = true,
  textLineCount = 1,
  hasMetaLine = false,
  actions = [],
  hasSelectAction = false,
  hasTrailingBadge = false,
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
      {(actions.length > NO_ITEMS || hasSelectAction || hasTrailingBadge) && (
        <div className="flex flex-wrap items-center gap-2">
          {hasSelectAction && <Skeleton className={SELECT_ACTION_CLASS} />}
          {hasTrailingBadge && <SkeletonBadge />}
          {actions.map(({ label, size = "sm", variant = "outline" }) => (
            <SkeletonButton key={label} size={size} variant={variant} label={label} />
          ))}
        </div>
      )}
    </div>
  </div>
);
