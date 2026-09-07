import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiClientError } from "@/shared/lib/apiClient";

import { paymentsApi } from "../api/paymentsApi";
import { isAlreadyPaidError, useInitiatePayment } from "./useInitiatePayment";

vi.mock("../api/paymentsApi", () => ({
  paymentsApi: { initiate: vi.fn() },
}));

const renderUseInitiatePayment = () => {
  const queryClient = new QueryClient();
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useInitiatePayment(), { wrapper }), invalidateSpy };
};

afterEach(() => {
  onlineManager.setOnline(true);
  vi.mocked(paymentsApi.initiate).mockReset();
});

describe("useInitiatePayment", () => {
  it("attempts to initiate payment immediately, even while the browser reports itself offline", async () => {
    onlineManager.setOnline(false);
    vi.mocked(paymentsApi.initiate).mockRejectedValue(new Error("network down"));
    const { result } = renderUseInitiatePayment();

    act(() => {
      result.current.mutate("order-1");
    });

    await waitFor(() => expect(paymentsApi.initiate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isPaused).toBe(false);
  });

  it("refetches the order and verify caches when the payment was already settled", async () => {
    vi.mocked(paymentsApi.initiate).mockRejectedValue(
      new ApiClientError("This order has already been paid.", "ALREADY_SETTLED"),
    );
    const { result, invalidateSpy } = renderUseInitiatePayment();

    act(() => {
      result.current.mutate("order-1");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["orders"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["payment-verify"] });
  });

  it("does not refetch anything for an ordinary failure", async () => {
    vi.mocked(paymentsApi.initiate).mockRejectedValue(new Error("gateway down"));
    const { result, invalidateSpy } = renderUseInitiatePayment();

    act(() => {
      result.current.mutate("order-1");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("isAlreadyPaidError", () => {
  it("matches only an ApiClientError carrying the ALREADY_SETTLED code", () => {
    expect(isAlreadyPaidError(new ApiClientError("x", "ALREADY_SETTLED"))).toBe(true);
    expect(isAlreadyPaidError(new ApiClientError("x", "NOT_FOUND"))).toBe(false);
    expect(isAlreadyPaidError(new Error("ALREADY_SETTLED"))).toBe(false);
    expect(isAlreadyPaidError(null)).toBe(false);
  });
});
