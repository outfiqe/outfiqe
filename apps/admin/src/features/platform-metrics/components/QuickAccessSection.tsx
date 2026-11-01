import { Skeleton } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BanknoteArrowUp,
  ClipboardList,
  LifeBuoy,
  type LucideIcon,
  Package,
  ShoppingBag,
} from "lucide-react";
import type { ReactNode } from "react";

import { platformMetricsApi } from "../api/platformMetricsApi";
import type { PlatformAttentionCounts } from "../api/platformMetricsSchemas";

const NOTHING_WAITING = 0;
const QUICK_ACCESS_GRID_CLASS = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6";
const QUICK_ACCESS_TILE_CLASS =
  "flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-4 text-center";

type QuickAccessShortcut = {
  readonly to: string;
  readonly search?: Record<string, string>;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly countKey: keyof PlatformAttentionCounts;
  readonly waitingLabel: string;
};

const QUICK_ACCESS_SHORTCUTS: QuickAccessShortcut[] = [
  {
    to: "/orders",
    search: { status: "PLACED" },
    label: "Orders",
    icon: ShoppingBag,
    countKey: "ordersToPack",
    waitingLabel: "to pack",
  },
  {
    to: "/products",
    search: { status: "PENDING" },
    label: "Products",
    icon: Package,
    countKey: "productsToReview",
    waitingLabel: "to review",
  },
  {
    to: "/platform/brand-applications",
    label: "Brand applications",
    icon: ClipboardList,
    countKey: "brandApplications",
    waitingLabel: "to review",
  },
  {
    to: "/orders/refunds",
    label: "Refunds",
    icon: BanknoteArrowUp,
    countKey: "refundsWaiting",
    waitingLabel: "waiting",
  },
  {
    to: "/withdraw-requests",
    label: "Withdrawal requests",
    icon: BanknoteArrowUp,
    countKey: "withdrawalRequests",
    waitingLabel: "waiting",
  },
  {
    to: "/support",
    label: "Support requests",
    icon: LifeBuoy,
    countKey: "supportRequests",
    waitingLabel: "open",
  },
];

const QuickAccessFrame = ({ children }: { children: ReactNode }) => (
  <section>
    <h2 className="font-display text-lg font-bold text-foreground">Needs action</h2>
    <div className={`mt-3 ${QUICK_ACCESS_GRID_CLASS}`}>{children}</div>
  </section>
);

const describeWaiting = (count: number | undefined, waitingLabel: string): string => {
  if (count === undefined) return "Open";
  if (count === NOTHING_WAITING) return "All clear";
  return `${count.toLocaleString()} ${waitingLabel}`;
};

export const QuickAccessSection = () => {
  const { data: attentionCounts } = useQuery({
    queryKey: ["platform-metrics-attention"],
    queryFn: platformMetricsApi.getAttentionCounts,
    retry: false,
  });

  return (
    <QuickAccessFrame>
      {QUICK_ACCESS_SHORTCUTS.map(({ to, search, label, icon: Icon, countKey, waitingLabel }) => {
        const count = attentionCounts?.[countKey];
        const hasWork = count !== undefined && count > NOTHING_WAITING;

        return (
          <Link
            key={label}
            to={to}
            search={search}
            className={`${QUICK_ACCESS_TILE_CLASS} transition-colors hover:border-foreground`}
          >
            <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-sm font-medium text-foreground">{label}</span>
            <span
              className={`text-xs ${hasWork ? "font-semibold text-destructive" : "text-muted-foreground"}`}
            >
              {describeWaiting(count, waitingLabel)}
            </span>
          </Link>
        );
      })}
    </QuickAccessFrame>
  );
};

export const QuickAccessSkeleton = () => (
  <QuickAccessFrame>
    {QUICK_ACCESS_SHORTCUTS.map(({ label }) => (
      <div key={label} className={QUICK_ACCESS_TILE_CLASS} aria-hidden>
        <Skeleton className="size-5 rounded-md" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-14" />
      </div>
    ))}
  </QuickAccessFrame>
);
