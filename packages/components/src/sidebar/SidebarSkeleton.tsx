import { Skeleton } from "@outfiqe/design-system";
import type { ReactElement } from "react";

import { cx } from "./cx";
import { cardClass, footerListClass, railClass } from "./styles";

const DEFAULT_ROW_COUNT = 6;

export type SidebarSkeletonProps = {
  readonly ariaLabel: string;
  readonly collapsed?: boolean;
  readonly rowCount?: number;
  readonly hasFooter?: boolean;
  readonly className?: string;
};

export const SidebarSkeleton = ({
  ariaLabel,
  collapsed = false,
  rowCount = DEFAULT_ROW_COUNT,
  hasFooter = false,
  className,
}: SidebarSkeletonProps): ReactElement => (
  <nav aria-label={ariaLabel} aria-busy="true" className={cx(railClass, className)}>
    <div className={cx(cardClass, "flex shrink-0 items-center gap-2.5")}>
      <Skeleton className="size-9 shrink-0 rounded-full" />
      {!collapsed && <Skeleton className="h-4 flex-1" />}
    </div>

    <div className={cx(cardClass, "flex min-h-0 flex-1 flex-col gap-1.5")}>
      {Array.from({ length: rowCount }, (_, index) => (
        <Skeleton key={index} className="h-11 w-full rounded-2xl" />
      ))}
    </div>

    {hasFooter && (
      <div className={cx(footerListClass, "shrink-0", collapsed && "items-center")}>
        <Skeleton className={collapsed ? "size-11 rounded-2xl" : "h-11 w-full rounded-2xl"} />
      </div>
    )}
  </nav>
);
