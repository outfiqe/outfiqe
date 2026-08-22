"use client";

import { Button, Skeleton } from "@outfiqe/design-system";

import { useMyXpTransactions } from "../hooks/useMyXpTransactions";
import { useXpProgress } from "../hooks/useXpProgress";
import { LevelProgressCard } from "./LevelProgressCard";
import { XpMultiplierBanner } from "./XpMultiplierBanner";
import { XpTransactionRow } from "./XpTransactionRow";

export const ProgressSection = () => {
  const { data: progress, isPending: isProgressPending } = useXpProgress();
  const { data, isPending, hasNextPage, fetchNextPage, isFetchingNextPage } = useMyXpTransactions();
  const transactions = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Your progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          XP from everyday activity on Outfiqe — posting, engaging, and selling.
        </p>
      </div>

      <div className="mt-6">
        <XpMultiplierBanner />
        <LevelProgressCard progress={progress} isLoading={isProgressPending} />
      </div>

      {isPending && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!isPending && transactions.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No XP yet — post a look, follow a creator, or make a purchase to start earning.
          </p>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="mt-6 space-y-3">
          {transactions.map((transaction) => (
            <XpTransactionRow key={transaction.id} transaction={transaction} />
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
