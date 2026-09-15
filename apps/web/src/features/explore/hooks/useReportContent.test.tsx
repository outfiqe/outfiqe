import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { exploreFeedApi } from "../api/exploreFeedApi";
import { useReportContent } from "./useReportContent";

vi.mock("../api/exploreFeedApi", () => ({
  exploreFeedApi: { submitContentReport: vi.fn() },
}));

const renderUseReportContent = (onSubmitted: () => void) => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useReportContent(onSubmitted), { wrapper });
};

afterEach(() => {
  vi.mocked(exploreFeedApi.submitContentReport).mockReset();
});

describe("useReportContent", () => {
  it("submits the report and calls onSubmitted", async () => {
    vi.mocked(exploreFeedApi.submitContentReport).mockResolvedValue(undefined);
    const onSubmitted = vi.fn();
    const { result } = renderUseReportContent(onSubmitted);

    act(() =>
      result.current.mutate({ targetType: "CREATOR_LOOK", targetId: "look-1", reason: "SPAM" }),
    );

    await waitFor(() =>
      expect(exploreFeedApi.submitContentReport).toHaveBeenCalledWith({
        targetType: "CREATOR_LOOK",
        targetId: "look-1",
        reason: "SPAM",
      }),
    );
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
  });

  it("does not call onSubmitted when the request fails", async () => {
    vi.mocked(exploreFeedApi.submitContentReport).mockRejectedValue(new Error("boom"));
    const onSubmitted = vi.fn();
    const { result } = renderUseReportContent(onSubmitted);

    act(() =>
      result.current.mutate({
        targetType: "CREATOR_LOOK_COMMENT",
        targetId: "comment-1",
        reason: "OTHER",
        note: "spam link",
      }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(onSubmitted).not.toHaveBeenCalled();
  });
});
