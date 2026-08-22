"use client";

import { useQuery } from "@tanstack/react-query";

import { creatorCompetitionApi } from "../api/creatorCompetitionApi";

export const useActiveCreatorCompetitions = () =>
  useQuery({
    queryKey: ["creator-competitions", "active"],
    queryFn: creatorCompetitionApi.listActive,
  });
