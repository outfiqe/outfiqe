import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { enqueueOfflineAction } from "@/features/pwa";

import { exploreFeedApi } from "../api/exploreFeedApi";
import { useFollowCreator } from "./useFollowCreator";

vi.mock("../api/exploreFeedApi", () => ({
  exploreFeedApi: { follow: vi.fn(), unfollow: vi.fn() },
}));

vi.mock("@/features/pwa", () => ({
  enqueueOfflineAction: vi.fn().mockResolvedValue(undefined),
}));

const renderUseFollowCreator = () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useFollowCreator(), { wrapper });
};

afterEach(() => {
  onlineManager.setOnline(true);
  vi.mocked(exploreFeedApi.follow).mockReset();
  vi.mocked(exploreFeedApi.unfollow).mockReset();
  vi.mocked(enqueueOfflineAction).mockClear();
});

describe("useFollowCreator", () => {
  it("calls the real api when there is a connection", async () => {
    vi.mocked(exploreFeedApi.follow).mockResolvedValue({ following: true, followerCount: 1 });
    const { result } = renderUseFollowCreator();

    act(() => result.current.mutate({ creatorId: "2", following: false }));

    await waitFor(() => expect(exploreFeedApi.follow).toHaveBeenCalledWith("2"));
    expect(enqueueOfflineAction).not.toHaveBeenCalled();
  });

  it("queues the follow instead of calling the api while offline", async () => {
    onlineManager.setOnline(false);
    const { result } = renderUseFollowCreator();

    act(() => result.current.mutate({ creatorId: "2", following: false }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(exploreFeedApi.follow).not.toHaveBeenCalled();
    expect(enqueueOfflineAction).toHaveBeenCalledWith("follow-creator", "follow-creator:2", {
      creatorId: "2",
      following: false,
    });
  });
});
