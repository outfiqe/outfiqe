"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { brandReturnApi } from "../api/brandReturnApi";
import { BRAND_RETURNS_QUERY_KEY } from "../constants/brandReturnLabels";

export const useBrandReturns = () =>
  useInfiniteCursorPage(BRAND_RETURNS_QUERY_KEY, (cursor) => brandReturnApi.list(cursor));
