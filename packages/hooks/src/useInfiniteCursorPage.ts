"use client";

import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { useCallback } from "react";

export type CursorPage = { nextCursor: string | null };

type Cursor = string | undefined;

export const useInfiniteCursorPage = <T extends CursorPage>(
  queryKey: readonly unknown[],
  fetchPage: (cursor?: string) => Promise<T>,
  enabled = true,
) => {
  const dropEmptyPages = useCallback((data: InfiniteData<T, Cursor>): InfiniteData<T, Cursor> => {
    const pages: T[] = [];
    const pageParams: Cursor[] = [];

    data.pages.forEach((page, index) => {
      if (page !== null && page !== undefined) {
        pages.push(page);
        pageParams.push(data.pageParams[index]);
      }
    });

    return { pages, pageParams };
  }, []);

  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: undefined as Cursor,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
    select: dropEmptyPages,
    enabled,
  });
};
