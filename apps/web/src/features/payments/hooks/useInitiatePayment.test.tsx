import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { paymentsApi } from "../api/paymentsApi";
import { useInitiatePayment } from "./useInitiatePayment";

vi.mock("../api/paymentsApi", () => ({
  paymentsApi: { initiate: vi.fn() },
}));

const renderUseInitiatePayment = () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useInitiatePayment(), { wrapper });
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
});
