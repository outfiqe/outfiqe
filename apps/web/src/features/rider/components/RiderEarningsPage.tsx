"use client";

import { Button, FormBanner, Skeleton } from "@outfiqe/design-system";

import { OwnerType, WithdrawSection } from "@/features/withdraw";

import { useInfiniteRiderEarnings } from "../hooks/useInfiniteRiderEarnings";
import { describeRiderLoadError } from "../utils/riderLoadError.utils";
import { RiderEarningRow } from "./RiderEarningRow";
import { RiderEarningsSummary } from "./RiderEarningsSummary";

const LOADING_ROW_COUNT = 3;
const NO_EARNINGS = 0;
const EARNINGS_NO_SIGNAL_MESSAGE =
  "We couldn't load your earnings. Check your signal and try again.";

export const RiderEarningsPage = () => {
  const earningsQuery = useInfiniteRiderEarnings();
  const pages = earningsQuery.data?.pages ?? [];
  const [firstPage] = pages;
  const earnings = pages.flatMap((page) => page.items);

  return (
    <div className="space-y-8">
      <section className="space-y-4" aria-labelledby="rider-earnings-heading">
        <div>
          <h1
            id="rider-earnings-heading"
            className="font-display text-2xl font-bold text-foreground"
          >
            Your earnings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each finished visit pays you. Money is held for 7 days, then you can withdraw it to your
            bank account below.
          </p>
        </div>

        {earningsQuery.isError && (
          <div className="space-y-3">
            <FormBanner>
              {describeRiderLoadError(earningsQuery.error, EARNINGS_NO_SIGNAL_MESSAGE)}
            </FormBanner>
            <Button variant="outline" onClick={() => void earningsQuery.refetch()}>
              Try again
            </Button>
          </div>
        )}

        {earningsQuery.isPending && (
          <div className="space-y-3" aria-busy="true" aria-label="Loading earnings">
            <Skeleton className="h-20 w-full rounded-2xl" />
            {Array.from({ length: LOADING_ROW_COUNT }, (_, rowIndex) => (
              <Skeleton key={rowIndex} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {firstPage && <RiderEarningsSummary summary={firstPage.summary} />}

        {firstPage && earnings.length === NO_EARNINGS && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No earnings yet. Finish a visit and it shows up here.
          </p>
        )}

        {earnings.length > NO_EARNINGS && (
          <ul className="space-y-3">
            {earnings.map((earning) => (
              <li key={earning.id}>
                <RiderEarningRow earning={earning} />
              </li>
            ))}
          </ul>
        )}

        {earningsQuery.hasNextPage && (
          <Button
            variant="outline"
            onClick={() => void earningsQuery.fetchNextPage()}
            isLoading={earningsQuery.isFetchingNextPage}
          >
            Show older earnings
          </Button>
        )}
      </section>

      <WithdrawSection
        ownerType={OwnerType.CREATOR}
        headingLevel="h2"
        title="Withdraw your earnings"
        description="Add and verify your bank account, then ask for a withdrawal when the window is open."
      />
    </div>
  );
};
