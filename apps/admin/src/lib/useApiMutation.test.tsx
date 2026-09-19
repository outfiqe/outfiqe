import { useApiMutation } from "@outfiqe/hooks";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const LIST_QUERY_KEY = ["items"];

const LIST_DATA = "list";

const createDeferred = () => {
  let resolve: () => void = () => {};
  const promise = new Promise<string>((resolvePromise) => {
    resolve = () => resolvePromise(LIST_DATA);
  });
  return { promise, resolve };
};

const renderMutationWithList = (
  options: {
    onSuccess?: () => void;
    invalidateKeys?: Parameters<typeof useApiMutation>[0]["invalidateKeys"];
  },
  listFetch: () => Promise<string>,
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(
    () => {
      const list = useQuery({ queryKey: LIST_QUERY_KEY, queryFn: listFetch });
      const mutation = useApiMutation({
        mutationFn: async () => "saved",
        invalidateKeys: options.invalidateKeys,
        onSuccess: options.onSuccess,
      });
      return { list, mutation };
    },
    { wrapper },
  );
};

describe("useApiMutation", () => {
  it("stays pending and holds onSuccess until the invalidated query has refetched", async () => {
    const refetch = createDeferred();
    let fetchCount = 0;
    const listFetch = () => {
      fetchCount += 1;
      return fetchCount === 1 ? Promise.resolve(LIST_DATA) : refetch.promise;
    };
    const onSuccess = vi.fn();

    const { result } = renderMutationWithList(
      { invalidateKeys: [LIST_QUERY_KEY], onSuccess },
      listFetch,
    );
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));

    act(() => result.current.mutation.mutate());

    await waitFor(() => expect(fetchCount).toBe(2));
    expect(result.current.mutation.isPending).toBe(true);
    expect(onSuccess).not.toHaveBeenCalled();

    await act(async () => refetch.resolve());

    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("resolves invalidateKeys from the mutation result and variables when given a function", async () => {
    let fetchCount = 0;
    const listFetch = () => {
      fetchCount += 1;
      return Promise.resolve(LIST_DATA);
    };
    const resolveKeys = vi.fn(() => [LIST_QUERY_KEY]);

    const { result } = renderMutationWithList({ invalidateKeys: resolveKeys }, listFetch);
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));

    act(() => result.current.mutation.mutate());

    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
    expect(resolveKeys).toHaveBeenCalledWith("saved", undefined);
    expect(fetchCount).toBe(2);
  });

  it("runs onSuccess without refetching anything when no invalidateKeys are given", async () => {
    let fetchCount = 0;
    const listFetch = () => {
      fetchCount += 1;
      return Promise.resolve(LIST_DATA);
    };
    const onSuccess = vi.fn();

    const { result } = renderMutationWithList({ onSuccess }, listFetch);
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));

    act(() => result.current.mutation.mutate());

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(fetchCount).toBe(1);
  });

  it("skips invalidation and onSuccess when the mutation fails", async () => {
    let fetchCount = 0;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const onSuccess = vi.fn();

    const { result } = renderHook(
      () => {
        useQuery({
          queryKey: LIST_QUERY_KEY,
          queryFn: () => {
            fetchCount += 1;
            return Promise.resolve(LIST_DATA);
          },
        });
        return useApiMutation({
          mutationFn: async () => {
            throw new Error("boom");
          },
          invalidateKeys: [LIST_QUERY_KEY],
          onSuccess,
        });
      },
      { wrapper },
    );
    await waitFor(() => expect(fetchCount).toBe(1));

    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(fetchCount).toBe(1);
  });
});
