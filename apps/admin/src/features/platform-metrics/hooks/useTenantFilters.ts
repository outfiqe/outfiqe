import { useDebouncedValue } from "@outfiqe/hooks";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { oneOfFilter, rawTextFilter, useSearchFilter } from "@/lib/useSearchFilter";

import { type TenantSort, tenantSortValues } from "../api/platformMetricsSchemas";
import { DEFAULT_TENANT_SORT } from "../constants/tenantMetrics.constants";

const FIRST_PAGE = 1;
const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;
const SORT_FILTER = oneOfFilter<TenantSort>(tenantSortValues, DEFAULT_TENANT_SORT);

const toPageNumber = (pageText: string): number => {
  const pageNumber = Number(pageText);
  return Number.isInteger(pageNumber) && pageNumber > FIRST_PAGE ? pageNumber : FIRST_PAGE;
};

export const useTenantFilters = () => {
  const navigate = useNavigate();
  const [plan] = useSearchFilter("plan", rawTextFilter);
  const [sort] = useSearchFilter("sort", SORT_FILTER);
  const [pageText] = useSearchFilter("page", rawTextFilter);
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebouncedValue(searchText, SEARCH_DEBOUNCE_MS).trim();

  const changeFilter = (filterChange: Record<string, string | undefined>) => {
    void navigate({
      to: ".",
      search: (previous: Record<string, unknown>): Record<string, unknown> => ({
        ...previous,
        ...filterChange,
        page: undefined,
      }),
      replace: true,
    });
  };

  const goToPage = (page: number) => {
    void navigate({
      to: ".",
      search: (previous: Record<string, unknown>): Record<string, unknown> => ({
        ...previous,
        page: page === FIRST_PAGE ? undefined : String(page),
      }),
      replace: true,
    });
  };

  return {
    plan,
    sort,
    page: toPageNumber(pageText),
    searchText,
    setSearchText,
    search: debouncedSearchText.length >= MIN_SEARCH_LENGTH ? debouncedSearchText : undefined,
    selectPlan: (nextPlan: string) => changeFilter({ plan: nextPlan || undefined }),
    selectSort: (nextSort: TenantSort) =>
      changeFilter({ sort: nextSort === DEFAULT_TENANT_SORT ? undefined : nextSort }),
    goToPage,
  };
};
