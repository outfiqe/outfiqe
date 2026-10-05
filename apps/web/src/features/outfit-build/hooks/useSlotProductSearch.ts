"use client";

import { useDebouncedValue, useInfiniteCursorPage } from "@outfiqe/hooks";

import { productsApi } from "@/features/products/api/productsApi";

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 1;

export const useSlotProductSearch = ({
  typeSlug,
  searchText,
  isEnabled,
}: {
  typeSlug: string | null;
  searchText: string;
  isEnabled: boolean;
}) => {
  const debouncedSearchText = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const query = debouncedSearchText.length >= MIN_QUERY_LENGTH ? debouncedSearchText : undefined;

  return useInfiniteCursorPage(
    ["outfit-product-search", typeSlug, query],
    (cursor) =>
      productsApi
        .list({ type: typeSlug ?? undefined, q: query, inStock: true, cursor })
        .then(({ products, nextCursor }) => ({ products, nextCursor })),
    isEnabled,
  );
};
