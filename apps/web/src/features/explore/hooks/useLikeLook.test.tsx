import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { enqueueOfflineAction } from "@/features/pwa";

import { exploreFeedApi } from "../api/exploreFeedApi";
import { useLikeLook } from "./useLikeLook";

vi.mock("../api/exploreFeedApi", () => ({
  exploreFeedApi: { like: vi.fn(), unlike: vi.fn() },
}));

vi.mock("@/features/pwa", () => ({
  enqueueOfflineAction: vi.fn().mockResolvedValue(undefined),
}));

const renderUseLikeLook = () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useLikeLook(), { wrapper });
};

afterEach(() => {
  onlineManager.setOnline(true);
  vi.mocked(exploreFeedApi.like).mockReset();
  vi.mocked(exploreFeedApi.unlike).mockReset();
  vi.mocked(enqueueOfflineAction).mockClear();
});

describe("useLikeLook", () => {
  it("calls the real api when there is a connection", async () => {
    vi.mocked(exploreFeedApi.like).mockResolvedValue({ liked: true, likeCount: 1 });
    const { result } = renderUseLikeLook();

    act(() => result.current.mutate({ lookId: "1", liked: false }));

    await waitFor(() => expect(exploreFeedApi.like).toHaveBeenCalledWith("1"));
    expect(enqueueOfflineAction).not.toHaveBeenCalled();
  });

  it("queues the like instead of calling the api while offline", async () => {
    onlineManager.setOnline(false);
    const { result } = renderUseLikeLook();

    act(() => result.current.mutate({ lookId: "1", liked: false }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(exploreFeedApi.like).not.toHaveBeenCalled();
    expect(enqueueOfflineAction).toHaveBeenCalledWith("like-look", "like-look:1", {
      lookId: "1",
      liked: false,
    });
  });
});
