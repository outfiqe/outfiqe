import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { exploreFeedApi } from "../../feed/api/exploreFeedApi";
import { useReportTag } from "./useReportTag";

vi.mock("../../feed/api/exploreFeedApi", () => ({
  exploreFeedApi: { submitTagReport: vi.fn() },
}));

const renderUseReportTag = (onSubmitted: () => void) => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useReportTag(onSubmitted), { wrapper });
};

afterEach(() => {
  vi.mocked(exploreFeedApi.submitTagReport).mockReset();
});

describe("useReportTag", () => {
  it("submits the tag report and calls onSubmitted", async () => {
    vi.mocked(exploreFeedApi.submitTagReport).mockResolvedValue(undefined);
    const onSubmitted = vi.fn();
    const { result } = renderUseReportTag(onSubmitted);

    act(() =>
      result.current.mutate({ lookId: "look-1", productId: "product-1", reason: "COUNTERFEIT" }),
    );

    await waitFor(() =>
      expect(exploreFeedApi.submitTagReport).toHaveBeenCalledWith({
        lookId: "look-1",
        productId: "product-1",
        reason: "COUNTERFEIT",
      }),
    );
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
  });

  it("does not call onSubmitted when the request fails", async () => {
    vi.mocked(exploreFeedApi.submitTagReport).mockRejectedValue(new Error("boom"));
    const onSubmitted = vi.fn();
    const { result } = renderUseReportTag(onSubmitted);

    act(() =>
      result.current.mutate({
        lookId: "look-1",
        productId: "product-1",
        reason: "OTHER",
        note: "Wrong product",
      }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(onSubmitted).not.toHaveBeenCalled();
  });
});
