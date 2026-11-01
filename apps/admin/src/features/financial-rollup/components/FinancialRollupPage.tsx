import { FilterChip } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { useSearchFilter } from "@/lib/useSearchFilter";

import { financialRollupApi } from "../api/financialRollupApi";
import {
  LEDGER_PATH,
  ROLLUP_RANGE_LABEL,
  ROLLUP_RANGE_ORDER,
} from "../constants/financialRollup.constants";
import { ROLLUP_RANGE_FILTER } from "../hooks/useLedgerFilters";
import { MoneyBreakdownSection } from "./MoneyBreakdownSection";
import { PayoutStatusSections } from "./PayoutStatusSections";
import { RollupEarningsSections } from "./RollupEarningsSections";
import { RollupInsightBanner, RollupMoneyCards } from "./RollupMoneyCards";
import { RollupSkeleton } from "./RollupSkeleton";

export const FinancialRollupPage = () => {
  const [range, setRange] = useSearchFilter("range", ROLLUP_RANGE_FILTER);

  const {
    data: rollup,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["financial-rollup", range],
    queryFn: () => financialRollupApi.get(range),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Financial rollup</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Where the money is: what came in, who is still owed, and what the platform earned. Click
            any number to see the orders behind it.
          </p>
        </div>
        <Link
          to={LEDGER_PATH}
          search={{ range }}
          className="text-sm font-medium text-foreground underline underline-offset-2"
        >
          Open the order ledger
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLLUP_RANGE_ORDER.map((rangeOption) => (
          <FilterChip
            key={rangeOption}
            isSelected={range === rangeOption}
            onClick={() => setRange(rangeOption)}
          >
            {ROLLUP_RANGE_LABEL[rangeOption]}
          </FilterChip>
        ))}
      </div>

      {isLoading && <RollupSkeleton />}
      {error && <p className="text-sm text-destructive">Couldn&apos;t load the rollup.</p>}

      {rollup && (
        <>
          <RollupInsightBanner rollup={rollup} />
          <RollupMoneyCards rollup={rollup} range={range} />
          <MoneyBreakdownSection />
          <PayoutStatusSections rollup={rollup} range={range} />
          <RollupEarningsSections rollup={rollup} range={range} />
        </>
      )}
    </div>
  );
};
