import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { enqueueOfflineAction } from "@/features/pwa";

import { exploreFeedApi } from "../api/exploreFeedApi";
import { useSaveLook } from "./useSaveLook";

vi.mock("../api/exploreFeedApi", () => ({
  exploreFeedApi: { save: vi.fn(), unsave: vi.fn() },
}));

vi.mock("@/features/pwa", () => ({
  enqueueOfflineAction: vi.fn().mockResolvedValue(undefined),
}));

const renderUseSaveLook = () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useSaveLook(), { wrapper });
};

afterEach(() => {
  onlineManager.setOnline(true);
  vi.mocked(exploreFeedApi.save).mockReset();
  vi.mocked(exploreFeedApi.unsave).mockReset();
  vi.mocked(enqueueOfflineAction).mockClear();
});

describe("useSaveLook", () => {
  it("calls the real api when there is a connection", async () => {
    vi.mocked(exploreFeedApi.save).mockResolvedValue({ saved: true, saveCount: 1 });
    const { result } = renderUseSaveLook();

    act(() => result.current.mutate({ lookId: "1", saved: false }));

    await waitFor(() => expect(exploreFeedApi.save).toHaveBeenCalledWith("1"));
    expect(enqueueOfflineAction).not.toHaveBeenCalled();
  });

  it("queues the save instead of calling the api while offline", async () => {
    onlineManager.setOnline(false);
    const { result } = renderUseSaveLook();

    act(() => result.current.mutate({ lookId: "1", saved: false }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(exploreFeedApi.save).not.toHaveBeenCalled();
    expect(enqueueOfflineAction).toHaveBeenCalledWith("save-look", "save-look:1", {
      lookId: "1",
      saved: false,
    });
  });
});
