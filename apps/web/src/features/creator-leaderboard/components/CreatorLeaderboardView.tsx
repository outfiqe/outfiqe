"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  CREATOR_LEADERBOARD_CATEGORY,
  CREATOR_LEADERBOARD_QUERY_PARAM,
  isCreatorLeaderboardCategory,
} from "../creatorLeaderboard.constants";
import { CreatorCompetitionBanner } from "./CreatorCompetitionBanner";
import { CreatorLeaderboardList } from "./CreatorLeaderboardList";
import { CreatorLeaderboardTabs } from "./CreatorLeaderboardTabs";

export const CreatorLeaderboardView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedCategory = searchParams.get(CREATOR_LEADERBOARD_QUERY_PARAM);
  const category =
    requestedCategory && isCreatorLeaderboardCategory(requestedCategory)
      ? requestedCategory
      : CREATOR_LEADERBOARD_CATEGORY.TOP_XP;

  const setCategory = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(CREATOR_LEADERBOARD_QUERY_PARAM, value);
    router.replace(`/leaderboard/creators?${params.toString()}`, { scroll: false });
  };

  return (
    <div>
      <CreatorLeaderboardTabs category={category} onChange={setCategory} />
      <div className="mt-6">
        <CreatorCompetitionBanner category={category} />
        <CreatorLeaderboardList category={category} />
      </div>
    </div>
  );
};
