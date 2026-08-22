"use client";

import { useQuery } from "@tanstack/react-query";

import { creatorLeaderboardApi } from "../api/creatorLeaderboardApi";

export const useCreatorLeaderboardCategories = () =>
  useQuery({
    queryKey: ["creator-leaderboard", "categories"],
    queryFn: creatorLeaderboardApi.listCategories,
  });
