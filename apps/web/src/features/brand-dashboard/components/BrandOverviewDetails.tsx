import {
  OverviewEmptyLine,
  OverviewListCard,
  OverviewListRow,
} from "@/components/OverviewListCard";
import { formatRupees } from "@/shared/lib/formatRupees";

import type { BrandOverview } from "../api/brandOverviewSchemas";

const NOTHING_IN_LIST = 0;
const SINGLE_UNIT = 1;

const toUnitsLabel = (unitsSold: number) => `${unitsSold.toLocaleString()} sold`;

const toStockLabel = (stockLeft: number) =>
  `${stockLeft.toLocaleString()} ${stockLeft === SINGLE_UNIT ? "item" : "items"} left`;

const BestSellers = ({ overview }: { overview: BrandOverview }) => {
  const { topProducts, kpis } = overview;

  return (
    <OverviewListCard
      title="Best sellers"
      description={`What sold most in the last ${kpis.periodDays} days.`}
    >
      {topProducts.length === NOTHING_IN_LIST ? (
        <OverviewEmptyLine>No sales in this period.</OverviewEmptyLine>
      ) : (
        topProducts.map(({ id, name, imageUrl, unitsSold, revenue }) => (
          <OverviewListRow
            key={id}
            href={`/product/${id}`}
            imageUrl={imageUrl}
            title={name}
            detail={toUnitsLabel(unitsSold)}
            value={formatRupees(revenue)}
          />
        ))
      )}
    </OverviewListCard>
  );
};

const RunningLow = ({ overview }: { overview: BrandOverview }) => {
  const { lowStockProducts } = overview;

  return (
    <OverviewListCard title="Running low" description="Restock these before they sell out.">
      {lowStockProducts.length === NOTHING_IN_LIST ? (
        <OverviewEmptyLine>Nothing is running low.</OverviewEmptyLine>
      ) : (
        lowStockProducts.map(({ id, name, imageUrl, stockLeft }) => (
          <OverviewListRow
            key={id}
            href="/products"
            imageUrl={imageUrl}
            title={name}
            detail="Update stock in Products"
            value={toStockLabel(stockLeft)}
          />
        ))
      )}
    </OverviewListCard>
  );
};

const YourMoney = ({ overview }: { overview: BrandOverview }) => {
  const { pendingPayout, availablePayout } = overview.kpis;

  return (
    <OverviewListCard
      title="Your money"
      description="Money from a sale starts as pending, then becomes yours to withdraw once the order clears."
    >
      <OverviewListRow
        href="/wallet"
        title="Pending"
        detail="From recent sales. You can't withdraw this yet."
        value={formatRupees(pendingPayout)}
      />
      <OverviewListRow
        href="/wallet"
        title="Ready to withdraw"
        detail="Cleared and yours to take out now."
        value={formatRupees(availablePayout)}
      />
    </OverviewListCard>
  );
};

export const BrandOverviewDetails = ({ overview }: { overview: BrandOverview }) => (
  <div className="mt-8 grid gap-4 lg:grid-cols-3">
    <BestSellers overview={overview} />
    <RunningLow overview={overview} />
    <YourMoney overview={overview} />
  </div>
);
