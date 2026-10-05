import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";
import { featureFlagsApi } from "@/shared/lib/featureFlagsApi";

import { useFeatureFlag } from "./useFeatureFlag";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/shared/lib/featureFlagsApi", () => ({ featureFlagsApi: { listMine: vi.fn() } }));

const renderWithQueryClient = (hook: () => boolean) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(hook, { wrapper });
};

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    state: { user: { id: "user-1" } },
  } as ReturnType<typeof useAuth>);
});

describe("useFeatureFlag", () => {
  it("is on once the API lists the flag for the person", async () => {
    vi.mocked(featureFlagsApi.listMine).mockResolvedValue(["outfit_builder"]);

    const { result } = renderWithQueryClient(() => useFeatureFlag("outfit_builder"));

    await waitFor(() => expect(result.current).toBe(true));
  });

  it("stays off for a flag the API does not list", async () => {
    vi.mocked(featureFlagsApi.listMine).mockResolvedValue(["outfit_photos"]);

    const { result } = renderWithQueryClient(() => useFeatureFlag("outfit_builder"));

    await waitFor(() => expect(featureFlagsApi.listMine).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it("stays off when the flags can't be loaded", async () => {
    vi.mocked(featureFlagsApi.listMine).mockRejectedValue(new Error("offline"));

    const { result } = renderWithQueryClient(() => useFeatureFlag("outfit_builder"));

    await waitFor(() => expect(featureFlagsApi.listMine).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });
});
