"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

export type CursorPage = { nextCursor: string | null };

export const useInfiniteCursorPage = <T extends CursorPage>(
  queryKey: readonly unknown[],
  fetchPage: (cursor?: string) => Promise<T>,
) => {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
};
