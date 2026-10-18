"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { riderEarningsApi } from "../api/riderEarningsApi";
import { RIDER_EARNINGS_QUERY_KEY } from "../constants/riderQueryKeys";

export const useInfiniteRiderEarnings = () =>
  useInfiniteCursorPage(RIDER_EARNINGS_QUERY_KEY, riderEarningsApi.listMyEarnings);
