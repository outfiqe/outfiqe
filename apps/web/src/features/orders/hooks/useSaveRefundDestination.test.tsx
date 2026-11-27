import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { refundDestinationQueryKey } from "../constants/refundQueryKeys";
import { orderQueryKey } from "../constants/trackingQueryKeys";
import { useSaveRefundDestination } from "./useSaveRefundDestination";

vi.mock("../api/ordersApi", () => ({
  ordersApi: {
    saveRefundDestination: vi.fn().mockResolvedValue({
      canEdit: true,
      amountAwaitingDetails: 0,
      destination: null,
    }),
  },
}));

vi.mock("@outfiqe/design-system", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const ORDERS_LIST_QUERY_KEY = ["orders", "list"];

describe("useSaveRefundDestination", () => {
  it("refreshes the order page and the orders list, not only the refund details", async () => {
    const queryClient = new QueryClient();
    for (const queryKey of [
      orderQueryKey("order-1"),
      refundDestinationQueryKey("order-1"),
      ORDERS_LIST_QUERY_KEY,
    ]) {
      queryClient.setQueryData(queryKey, {});
    }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSaveRefundDestination("order-1"), { wrapper });

    act(() => {
      result.current.mutate({
        kind: "ESEWA",
        walletId: "9812345678",
        accountName: "Test Buyer",
        confirmsOwnership: true,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryState(orderQueryKey("order-1"))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(refundDestinationQueryKey("order-1"))?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(ORDERS_LIST_QUERY_KEY)?.isInvalidated).toBe(true);
  });
});
