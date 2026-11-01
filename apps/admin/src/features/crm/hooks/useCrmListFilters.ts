import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { rawTextFilter, useSearchFilter } from "@/lib/useSearchFilter";

const FIRST_PAGE = 1;
const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

const toPageNumber = (pageText: string): number => {
  const pageNumber = Number(pageText);
  return Number.isInteger(pageNumber) && pageNumber > FIRST_PAGE ? pageNumber : FIRST_PAGE;
};

export const useCrmListFilters = () => {
  const navigate = useNavigate();
  const [savedSearch] = useSearchFilter("q", rawTextFilter);
  const [pageText] = useSearchFilter("page", rawTextFilter);
  const [searchText, setSearchText] = useState(savedSearch);
  const pendingSearchWrite = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(pendingSearchWrite.current), []);

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

  const changeSearchText = (nextSearchText: string) => {
    setSearchText(nextSearchText);
    clearTimeout(pendingSearchWrite.current);
    pendingSearchWrite.current = setTimeout(() => {
      const trimmedText = nextSearchText.trim();
      changeFilter({ q: trimmedText.length >= MIN_SEARCH_LENGTH ? trimmedText : undefined });
    }, SEARCH_DEBOUNCE_MS);
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
    searchText,
    changeSearchText,
    search: savedSearch || undefined,
    page: toPageNumber(pageText),
    goToPage,
    changeFilter,
  };
};
