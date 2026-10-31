import type { BaselineSourceValue, TrendDebugSnapshot } from "../api/trendingSchemas";

const NO_ACTIONS = 0;
const NO_BOOST = 1;
const SAME_LEVEL_LOW = 0.9;
const SAME_LEVEL_HIGH = 1.1;
const PERCENT_SCALE = 100;
const SINGLE_ACTION = 1;

type RecentActivity = TrendDebugSnapshot["recentActivity"];

const BASELINE_COMPARISON_LABEL: Record<BaselineSourceValue, string> = {
  product: "Compared with its own normal level",
  category: "Compared with similar products",
  global: "Compared with the whole catalog",
};

const MISSING_SIGNAL_TIPS: { signal: keyof RecentActivity; tip: string }[] = [
  { signal: "purchaseUnits", tip: "No purchases. A sale counts the most." },
  { signal: "cartAdds", tip: "No cart adds." },
  { signal: "saves", tip: "No stashes." },
  { signal: "creatorTags", tip: "No muse tagged it in a look." },
  { signal: "tagClicks", tip: "Nobody tapped its tag on a look." },
];

export const formatNumber = (value: number): string =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export const countRecentActions = (recentActivity: RecentActivity): number =>
  Object.values(recentActivity).reduce((total, count) => total + count, NO_ACTIONS);

const describeActionCount = (actionCount: number): string =>
  `${actionCount.toLocaleString()} shopper ${actionCount === SINGLE_ACTION ? "action" : "actions"}`;

export type TrendVerdict = {
  tone: "success" | "neutral";
  headline: string;
  detail: string;
};

export const describeTrendVerdict = ({
  rank,
  recentActivity,
}: TrendDebugSnapshot): TrendVerdict => {
  const actionCount = countRecentActions(recentActivity);

  if (rank !== null) {
    return {
      tone: "success",
      headline: `Trending at #${rank}`,
      detail:
        actionCount === NO_ACTIONS
          ? "Nothing happened in the last 6 hours, but activity from earlier days is keeping it on the list."
          : `It had ${describeActionCount(actionCount)} in the last 6 hours.`,
    };
  }

  if (actionCount === NO_ACTIONS) {
    return {
      tone: "neutral",
      headline: "Not trending",
      detail: "Nobody bought, carted, stashed, tagged or tapped this product in the last 6 hours.",
    };
  }

  return {
    tone: "neutral",
    headline: "Not trending yet",
    detail: `It had ${describeActionCount(actionCount)} in the last 6 hours, which isn't enough to reach the list.`,
  };
};

export const describeChange = (ratio: number): string => {
  if (ratio <= NO_ACTIONS) return "No activity";
  if (ratio >= SAME_LEVEL_LOW && ratio <= SAME_LEVEL_HIGH) return "About the same";
  return ratio > SAME_LEVEL_HIGH ? `${formatNumber(ratio)}× busier` : "Quieter";
};

export const toBaselineComparisonLabel = (source: BaselineSourceValue): string =>
  BASELINE_COMPARISON_LABEL[source];

export const describeFreshnessBoost = (freshnessMultiplier: number): string =>
  freshnessMultiplier > NO_BOOST
    ? `+${Math.round((freshnessMultiplier - NO_BOOST) * PERCENT_SCALE)}%`
    : "None";

export const listMissingSignalTips = (recentActivity: RecentActivity): string[] =>
  MISSING_SIGNAL_TIPS.filter(({ signal }) => recentActivity[signal] === NO_ACTIONS).map(
    ({ tip }) => tip,
  );
