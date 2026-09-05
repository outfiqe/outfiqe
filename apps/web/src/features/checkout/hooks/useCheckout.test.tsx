import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { checkoutApi } from "../api/checkoutApi";
import { useCheckout } from "./useCheckout";

vi.mock("../api/checkoutApi", () => ({
  checkoutApi: { submit: vi.fn() },
}));

const renderUseCheckout = () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useCheckout(), { wrapper });
};

afterEach(() => {
  onlineManager.setOnline(true);
  vi.mocked(checkoutApi.submit).mockReset();
});

describe("useCheckout", () => {
  it("attempts the order immediately, even while the browser reports itself offline", async () => {
    onlineManager.setOnline(false);
    vi.mocked(checkoutApi.submit).mockRejectedValue(new Error("network down"));
    const { result } = renderUseCheckout();

    act(() => {
      result.current.mutate({ input: {} as never, idempotencyKey: "key-1" });
    });

    await waitFor(() => expect(checkoutApi.submit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isPaused).toBe(false);
  });
});
