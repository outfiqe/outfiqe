import { Button } from "@outfiqe/design-system";

import { useDeliveryZoneHistory } from "./hooks/useDeliveryZoneHistory";

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export const DeliveryZoneHistorySection = () => {
  const {
    data: historyQuery,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useDeliveryZoneHistory();
  const historyEntries = historyQuery?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Change history</h2>
      <div className="mt-4 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && historyEntries.length === 0 && (
          <p className="text-sm text-muted-foreground">No changes yet.</p>
        )}

        {historyEntries.map((entry) => (
          <div key={entry.id} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-foreground">
              {entry.changedByName} changed {entry.zoneName} on {formatDateTime(entry.createdAt)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Delivery Rs. {entry.oldValues.standardDeliveryFee} → Rs.{" "}
              {entry.newValues.standardDeliveryFee} · Free delivery over Rs.{" "}
              {entry.oldValues.freeDeliveryThreshold} → Rs. {entry.newValues.freeDeliveryThreshold}{" "}
              · COD fee Rs. {entry.oldValues.codHandlingFee} → Rs. {entry.newValues.codHandlingFee}
              {entry.oldValues.isDefault !== entry.newValues.isDefault &&
                (entry.newValues.isDefault ? " · became the default zone" : " · no longer default")}
            </p>
          </div>
        ))}

        {hasNextPage && (
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mx-auto"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        )}
      </div>
    </div>
  );
};
