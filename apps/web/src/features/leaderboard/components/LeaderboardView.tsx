"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  isLeaderboardCategory,
  LEADERBOARD_CATEGORY,
  LEADERBOARD_QUERY_PARAM,
} from "../leaderboard.constants";
import { LeaderboardList } from "./LeaderboardList";
import { LeaderboardTabs } from "./LeaderboardTabs";

export const LeaderboardView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedCategory = searchParams.get(LEADERBOARD_QUERY_PARAM);
  const category =
    requestedCategory && isLeaderboardCategory(requestedCategory)
      ? requestedCategory
      : LEADERBOARD_CATEGORY.TRENDING;

  const setCategory = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(LEADERBOARD_QUERY_PARAM, value);
    router.replace(`/leaderboard?${params.toString()}`, { scroll: false });
  };

  return (
    <div>
      <LeaderboardTabs category={category} onChange={setCategory} />
      <div className="mt-6">
        <LeaderboardList category={category} />
      </div>
    </div>
  );
};
