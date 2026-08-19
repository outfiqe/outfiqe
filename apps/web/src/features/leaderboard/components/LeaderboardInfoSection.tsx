import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { LEADERBOARD_TABS } from "../leaderboard.constants";

const CATEGORY_EXPLANATIONS: Record<string, string> = {
  trending: "Blends recent sales, saves, and creator tags into one momentum score.",
  "most-purchased": "Total units sold across all of a brand's products this week.",
  "most-loved": "Net new followers gained this week.",
  "fastest-growing": "Percentage growth in sales compared to last week.",
};

export const LeaderboardInfoSection = () => {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border p-5">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground">
          How rankings work
        </h4>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {LEADERBOARD_TABS.map((tab) => (
            <div key={tab.value}>
              <dt className="text-[13px] font-semibold text-foreground">{tab.label}</dt>
              <dd className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
                {CATEGORY_EXPLANATIONS[tab.value]}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-xl border border-border p-5">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground">
          Reading the board
        </h4>
        <ul className="mt-4 flex flex-col gap-3 text-[12.5px] text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-3">
          <li className="flex items-center gap-2.5">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-extrabold text-primary-foreground">
              1
            </span>
            1st, 2nd, and 3rd place get their own colors on the podium.
          </li>
          <li className="flex items-center gap-2.5">
            <TrendingUp className="size-3.5 shrink-0 text-emerald-600" />
            Moved up since last week.
          </li>
          <li className="flex items-center gap-2.5">
            <TrendingDown className="size-3.5 shrink-0 text-red-600" />
            Moved down since last week.
          </li>
          <li className="flex items-center gap-2.5">
            <Minus className="size-3.5 shrink-0" />
            Same rank as last week.
          </li>
        </ul>
        <p className="mt-4 text-[12.5px] leading-snug text-muted-foreground">
          Rankings reset every Monday, so every week is a clean slate.
        </p>
      </div>
    </section>
  );
};
