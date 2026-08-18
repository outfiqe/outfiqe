"use client";

import { Button, Skeleton } from "@outfiqe/design-system";

import { CreatorStatus } from "@/features/auth/types";

import { useEarningsSummary } from "../hooks/useEarningsSummary";
import { useMyEarnings } from "../hooks/useMyEarnings";
import { CreatorStatusGate } from "./CreatorStatusGate";
import { EarningsLedgerRow } from "./EarningsLedgerRow";
import { EarningsSummaryTiles } from "./EarningsSummaryTiles";

type EarningsSectionProps = {
  creatorStatus: CreatorStatus;
};

export const EarningsSection = ({ creatorStatus }: EarningsSectionProps) => {
  const { data: summary, isPending: isSummaryPending } = useEarningsSummary();
  const { data, isPending, hasNextPage, fetchNextPage, isFetchingNextPage } = useMyEarnings();
  const earnings = data?.pages.flatMap((page) => page.items) ?? [];

  if (creatorStatus !== CreatorStatus.APPROVED) {
    return (
      <CreatorStatusGate
        creatorStatus={creatorStatus}
        pitch="Post your fits, tag the pieces you're wearing, and earn commission when someone buys through your post or link."
      />
    );
  }

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Earnings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Commission from sales attributed to your posts and links.
        </p>
      </div>

      <div className="mt-6">
        <EarningsSummaryTiles summary={summary} isLoading={isSummaryPending} />
      </div>

      {isPending && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!isPending && earnings.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No earnings yet — tag products in your posts to start earning.
          </p>
        </div>
      )}

      {earnings.length > 0 && (
        <div className="mt-6 space-y-3">
          {earnings.map((commission) => (
            <EarningsLedgerRow key={commission.id} commission={commission} />
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
};
