import { FormBanner, Select } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

import { TableSkeleton } from "@/components/TableSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";

import { BUILD_METRICS_QUERY_KEY, outfitBuildsApi } from "./api";

const WEEK_CHOICES = [4, 12, 26, 52] as const;
const DEFAULT_WEEK_COUNT = 12;
const SKELETON_ROW_COUNT = 6;
const NO_COMMISSIONS = 0;

const WEEK_COLUMNS = [
  "Week of",
  "Started alone",
  "Started in a chat",
  "Locked",
  "Made public",
  "Chimes",
  "Cheriqs",
  "Stashes",
  "Full-set orders",
  "Picked-item orders",
];

const SCOPE_LABEL = { CREATOR_LOOK: "Drop", OUTFIT_BUILD: "Build" } as const;

const describeRange = (minPrice: number, maxPrice: number | null): string =>
  maxPrice === null ? `Rs. ${minPrice} and above` : `Rs. ${minPrice}–${maxPrice}`;

export const BuildMetricsSection = () => {
  const weeksFieldId = useId();
  const [weekCount, setWeekCount] = useState<number>(DEFAULT_WEEK_COUNT);
  const metrics = useQuery({
    queryKey: [BUILD_METRICS_QUERY_KEY, weekCount],
    queryFn: () => outfitBuildsApi.metrics(weekCount),
  });

  return (
    <div className="space-y-6">
      <div className="max-w-xs space-y-1">
        <label htmlFor={weeksFieldId} className="text-xs text-muted-foreground">
          Period
        </label>
        <Select
          id={weeksFieldId}
          value={String(weekCount)}
          onChange={(event) => setWeekCount(Number(event.target.value))}
        >
          {WEEK_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              Last {choice} weeks
            </option>
          ))}
        </Select>
      </div>

      {metrics.isLoading && <TableSkeleton headers={WEEK_COLUMNS} rowCount={SKELETON_ROW_COUNT} />}
      {metrics.error && <FormBanner>{getErrorMessage(metrics.error)}</FormBanner>}

      {metrics.data && (
        <>
          <p className="text-sm text-muted-foreground">
            Right now {metrics.data.sharedBuildCount} builds are shared and{" "}
            {metrics.data.publicBuildCount} are public.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Builds by week</caption>
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  {WEEK_COLUMNS.map((column) => (
                    <th key={column} scope="col" className="py-2 pr-4">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.data.weeks.map((week) => (
                  <tr key={week.weekStart} className="border-t border-border">
                    <th scope="row" className="py-2 pr-4 font-normal">
                      {new Date(week.weekStart).toLocaleDateString()}
                    </th>
                    <td className="py-2 pr-4">{week.buildsStartedAlone}</td>
                    <td className="py-2 pr-4">{week.buildsStartedFromChat}</td>
                    <td className="py-2 pr-4">{week.buildsLocked}</td>
                    <td className="py-2 pr-4">{week.buildsMadePublic}</td>
                    <td className="py-2 pr-4">{week.comments}</td>
                    <td className="py-2 pr-4">{week.likes}</td>
                    <td className="py-2 pr-4">{week.saves}</td>
                    <td className="py-2 pr-4">{week.fullSetOrders}</td>
                    <td className="py-2 pr-4">{week.pickedItemOrders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section aria-labelledby="commission-by-rate-heading" className="space-y-2">
            <h2
              id="commission-by-rate-heading"
              className="font-display text-lg font-bold text-foreground"
            >
              Commission earned at each rate
            </h2>
            {metrics.data.commissionByTier.length === NO_COMMISSIONS ? (
              <p className="text-sm text-muted-foreground">No commission in this period.</p>
            ) : (
              <ul className="space-y-2">
                {metrics.data.commissionByTier.map((tier) => (
                  <li
                    key={tier.tierId}
                    className="rounded-xl border border-border bg-card p-3 text-sm"
                  >
                    <span className="font-medium text-foreground">{SCOPE_LABEL[tier.scope]}</span> ·{" "}
                    {describeRange(tier.minPrice, tier.maxPrice)} pays Rs. {tier.amount} ·{" "}
                    {tier.commissionCount} commissions, Rs. {tier.totalAmount} in total
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
};
