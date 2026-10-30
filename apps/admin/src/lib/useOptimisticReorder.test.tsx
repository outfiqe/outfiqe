import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useOptimisticReorder } from "./useOptimisticReorder";

type Row = { id: string };

const QUERY_KEY = ["rows"];
const ORIGINAL_ROWS: Row[] = [{ id: "first" }, { id: "second" }];
const REVERSED_IDS = ["second", "first"];

const renderReorderHook = (reorderIds: (orderedIds: string[]) => Promise<void>) => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(QUERY_KEY, ORIGINAL_ROWS);
  const onReorderError = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => useOptimisticReorder<Row>({ queryKey: QUERY_KEY, reorderIds, onReorderError }),
    { wrapper },
  );
  return { queryClient, onReorderError, result };
};

describe("useOptimisticReorder", () => {
  it("shows the new order in the cache before the request finishes", async () => {
    let finishRequest = () => {};
    const { queryClient, result } = renderReorderHook(
      () =>
        new Promise<void>((resolve) => {
          finishRequest = resolve;
        }),
    );

    act(() => result.current.mutate(REVERSED_IDS));

    await waitFor(() =>
      expect(queryClient.getQueryData(QUERY_KEY)).toEqual([{ id: "second" }, { id: "first" }]),
    );
    act(() => finishRequest());
  });

  it("restores the old order and reports the error when the request fails", async () => {
    const reorderFailure = new Error("reorder failed");
    const { queryClient, onReorderError, result } = renderReorderHook(() =>
      Promise.reject(reorderFailure),
    );

    act(() => result.current.mutate(REVERSED_IDS));

    await waitFor(() => expect(onReorderError).toHaveBeenCalledWith(reorderFailure));
    expect(queryClient.getQueryData(QUERY_KEY)).toEqual(ORIGINAL_ROWS);
  });
});
