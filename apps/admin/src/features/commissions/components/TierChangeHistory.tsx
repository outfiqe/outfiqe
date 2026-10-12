import { Button } from "@outfiqe/design-system";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";

import type { CommissionScopeValue, TierChange } from "../api/commissionsSchemas";
import { useInfiniteTierHistory } from "../hooks/useInfiniteTierHistory";

const SKELETON_ROW_COUNT = 2;

const describeBand = (tier: TierChange["after"]): string => {
  if (!tier) return "removed";
  const priceBand =
    tier.maxPrice === null
      ? `Rs. ${tier.minPrice.toLocaleString()}+`
      : `Rs. ${tier.minPrice.toLocaleString()} – Rs. ${tier.maxPrice.toLocaleString()}`;
  return `${priceBand} → Rs. ${tier.amount.toLocaleString()}`;
};

const TierChangeRow = ({ change }: { change: TierChange }) => {
  const { actorName, before, after, createdAt } = change;
  return (
    <li className="rounded-xl border border-border bg-card p-3 text-sm">
      <p className="text-foreground">
        {before
          ? `${describeBand(before)} ⟶ ${describeBand(after)}`
          : `Added ${describeBand(after)}`}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {actorName ?? "Unknown admin"} · {new Date(createdAt).toLocaleString()}
      </p>
    </li>
  );
};

export const TierChangeHistory = ({ scope }: { scope: CommissionScopeValue }) => {
  const {
    data: historyQuery,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteTierHistory(scope);
  const changes = historyQuery?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section aria-label="Change history">
      <h3 className="font-display text-sm font-bold text-foreground">Change history</h3>
      <div className="mt-3 space-y-2">
        {isLoading &&
          Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
            <CardRowSkeleton key={index} textLineCount={2} />
          ))}
        {error && (
          <p className="text-sm text-destructive">Couldn&apos;t load the change history.</p>
        )}
        {!isLoading && !error && changes.length === 0 && (
          <p className="text-sm text-muted-foreground">No changes yet.</p>
        )}
        {changes.length > 0 && (
          <ul className="space-y-2">
            {changes.map((change) => (
              <TierChangeRow key={change.id} change={change} />
            ))}
          </ul>
        )}
        {hasNextPage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchNextPage()}
            isLoading={isFetchingNextPage}
          >
            Show older changes
          </Button>
        )}
      </div>
    </section>
  );
};
