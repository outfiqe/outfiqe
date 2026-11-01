import { formatDate } from "@outfiqe/utils";

import {
  OverviewEmptyLine,
  OverviewListCard,
  OverviewListRow,
} from "@/components/OverviewListCard";
import { formatRupees } from "@/shared/lib/formatRupees";

import type { CreatorOverview } from "../api/creatorOverviewSchemas";

const NOTHING_IN_LIST = 0;
const SINGLE_SALE = 1;

const SOURCE_LABEL: Record<string, string> = {
  TAG_CLICK: "Tags on your looks",
  INTERNAL_LINK: "Your links on Outfiqe",
  EXTERNAL_LINK: "Your links shared outside",
  OUTFIT_BUILD: "Outfit builds",
};

const toSalesLabel = (salesCount: number) =>
  `${salesCount.toLocaleString()} ${salesCount === SINGLE_SALE ? "sale" : "sales"}`;

const TopLooks = ({ overview }: { overview: CreatorOverview }) => {
  const { topLooks, handle, kpis } = overview;

  return (
    <OverviewListCard
      title="Your top looks"
      description={`What earned most in the last ${kpis.periodDays} days.`}
    >
      {topLooks.length === NOTHING_IN_LIST ? (
        <OverviewEmptyLine>Drop a look to see it here.</OverviewEmptyLine>
      ) : (
        topLooks.map(({ id, imageUrl, caption, likeCount, salesCount, earnings }) => (
          <OverviewListRow
            key={id}
            href={`/creator/${handle}?look=${id}`}
            imageUrl={imageUrl}
            title={caption ?? "Look"}
            detail={`${toSalesLabel(salesCount)} · ${likeCount.toLocaleString()} cheriqs`}
            value={formatRupees(earnings)}
          />
        ))
      )}
    </OverviewListCard>
  );
};

const EarningsBySource = ({ overview }: { overview: CreatorOverview }) => {
  const { earningsBySource, kpis } = overview;

  return (
    <OverviewListCard
      title="Where you earned"
      description={`How shoppers reached you in the last ${kpis.periodDays} days.`}
    >
      {earningsBySource.length === NOTHING_IN_LIST ? (
        <OverviewEmptyLine>No sales in this period.</OverviewEmptyLine>
      ) : (
        earningsBySource.map(({ source, earnings, salesCount }) => (
          <OverviewListRow
            key={source}
            href="/earnings"
            title={SOURCE_LABEL[source] ?? "Other"}
            detail={toSalesLabel(salesCount)}
            value={formatRupees(earnings)}
          />
        ))
      )}
    </OverviewListCard>
  );
};

const YourMoney = ({ overview }: { overview: CreatorOverview }) => {
  const { kpis, nextAvailableAt } = overview;

  return (
    <OverviewListCard
      title="Your money"
      description="Commission starts as pending, then becomes yours to withdraw once the order clears."
    >
      <OverviewListRow
        href="/earnings"
        title="Pending"
        detail={
          nextAvailableAt
            ? `More becomes available on ${formatDate(nextAvailableAt)}.`
            : "From recent sales. You can't withdraw this yet."
        }
        value={formatRupees(kpis.pendingEarnings)}
      />
      <OverviewListRow
        href="/withdraw"
        title="Ready to withdraw"
        detail="Cleared and yours to take out now."
        value={formatRupees(kpis.availableEarnings)}
      />
    </OverviewListCard>
  );
};

export const CreatorOverviewDetails = ({ overview }: { overview: CreatorOverview }) => (
  <div className="mt-8 grid gap-4 lg:grid-cols-3">
    <TopLooks overview={overview} />
    <EarningsBySource overview={overview} />
    <YourMoney overview={overview} />
  </div>
);
