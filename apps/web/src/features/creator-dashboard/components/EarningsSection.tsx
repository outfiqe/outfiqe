"use client";

import { Button, Skeleton } from "@outfiqe/design-system";

import { CreatorStatus } from "@/features/auth/types";

import { useEarningsSummary } from "../hooks/useEarningsSummary";
import { useMyEarnings } from "../hooks/useMyEarnings";
import { ApplyAsCreatorButton } from "./ApplyAsCreatorButton";
import { EarningsLedgerRow } from "./EarningsLedgerRow";
import { EarningsSummaryTiles } from "./EarningsSummaryTiles";

type EarningsSectionProps = {
  creatorStatus: CreatorStatus;
};

export const EarningsSection = ({ creatorStatus }: EarningsSectionProps) => {
  const { data: summary, isLoading: isSummaryLoading } = useEarningsSummary();
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useMyEarnings();
  const earnings = data?.pages.flatMap((page) => page.items) ?? [];

  if (creatorStatus === CreatorStatus.PENDING) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="font-display text-xl font-bold text-foreground">Application under review</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;re looking at your creator application. We&apos;ll email you once it&apos;s
          reviewed.
        </p>
      </div>
    );
  }

  if (creatorStatus !== CreatorStatus.APPROVED) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="font-display text-xl font-bold text-foreground">Become a creator</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Post your fits, tag the pieces you&apos;re wearing, and earn commission when someone buys
          through your post or link.
        </p>
        {creatorStatus === CreatorStatus.REJECTED && (
          <p className="mt-2 text-sm text-muted-foreground">
            Your last application wasn&apos;t a fit. You&apos;re welcome to apply again.
          </p>
        )}
        <div className="mt-4">
          <ApplyAsCreatorButton />
        </div>
      </div>
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
        <EarningsSummaryTiles summary={summary} isLoading={isSummaryLoading} />
      </div>

      {isLoading && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && earnings.length === 0 && (
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
