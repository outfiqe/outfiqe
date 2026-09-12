import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { profileApi } from "../api/profileApi";
import { useHandleAvailability } from "./useHandleAvailability";

vi.mock("../api/profileApi", () => ({
  profileApi: {
    checkHandleAvailability: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "QueryClientTestWrapper";

  return Wrapper;
};

describe("useHandleAvailability", () => {
  it("reports invalid immediately, without waiting for the debounce, for a badly formatted candidate", () => {
    const { result } = renderHook(() => useHandleAvailability("no way", "currenthandle"), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe("invalid");
    expect(profileApi.checkHandleAvailability).not.toHaveBeenCalled();
  });

  it("stays idle and never calls the endpoint when the candidate equals the current handle", async () => {
    const { result } = renderHook(() => useHandleAvailability("currenthandle", "currenthandle"), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe("idle");

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(profileApi.checkHandleAvailability).not.toHaveBeenCalled();
  });

  it("checks availability after the debounce for a valid, changed candidate and reports the result", async () => {
    vi.mocked(profileApi.checkHandleAvailability).mockResolvedValue({ available: true });

    const { result, rerender } = renderHook(
      ({ draftHandle }) => useHandleAvailability(draftHandle, "currenthandle"),
      { wrapper: createWrapper(), initialProps: { draftHandle: "currenthandle" } },
    );

    expect(result.current).toBe("idle");

    rerender({ draftHandle: "newhandle" });

    expect(result.current).toBe("checking");
    expect(profileApi.checkHandleAvailability).not.toHaveBeenCalled();

    await waitFor(() => expect(result.current).toBe("available"), { timeout: 2000 });
    expect(profileApi.checkHandleAvailability).toHaveBeenCalledWith("newhandle");
  });

  it("reports taken when the debounced check comes back unavailable", async () => {
    vi.mocked(profileApi.checkHandleAvailability).mockResolvedValue({ available: false });

    const { result, rerender } = renderHook(
      ({ draftHandle }) => useHandleAvailability(draftHandle, "currenthandle"),
      { wrapper: createWrapper(), initialProps: { draftHandle: "currenthandle" } },
    );

    rerender({ draftHandle: "takenhandle" });

    await waitFor(() => expect(result.current).toBe("taken"), { timeout: 2000 });
  });
});
