import { Skeleton } from "@outfiqe/design-system";

export const StatCard = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="mt-1 font-display text-xl font-bold text-foreground">{value}</p>
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

export const ActivityStat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg bg-muted px-3 py-2 text-center">
    <p className="font-display text-lg font-bold text-foreground">{value}</p>
    <p className="text-[11px] text-muted-foreground">{label}</p>
  </div>
);

export const StatCardSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-4" aria-hidden>
    <Skeleton className="h-4 w-24" />
    <Skeleton className="mt-1 h-7 w-20" />
    <Skeleton className="mt-1 h-4 w-40" />
  </div>
);

export const ActivityStatSkeleton = () => (
  <div className="flex flex-col items-center rounded-lg bg-muted px-3 py-2" aria-hidden>
    <Skeleton className="h-7 w-8" />
    <Skeleton className="h-4 w-16" />
  </div>
);
