"use client";

import { useState } from "react";

import { useDebouncedValue } from "./useDebouncedValue";

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

export const useDebouncedSearch = () => {
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebouncedValue(searchText, SEARCH_DEBOUNCE_MS).trim();

  return {
    searchText,
    setSearchText,
    search: debouncedSearchText.length >= MIN_SEARCH_LENGTH ? debouncedSearchText : undefined,
  };
};
