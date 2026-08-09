"use client";

import { useQuery } from "@tanstack/react-query";

import { creatorLooksApi } from "../api/creatorLooksApi";

export const useMyLooks = () => {
  return useQuery({
    queryKey: ["creator-looks", "mine"],
    queryFn: creatorLooksApi.listMine,
  });
};
