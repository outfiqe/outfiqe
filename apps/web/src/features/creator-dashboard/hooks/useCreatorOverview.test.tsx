import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreatorStatus } from "@/features/auth/types";
import { DEFAULT_OVERVIEW_PERIOD_DAYS } from "@/shared/lib/overviewPeriod";

import { creatorOverviewApi } from "../api/creatorOverviewApi";
import { useCreatorOverview } from "./useCreatorOverview";

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock("../api/creatorOverviewApi", () => ({
  creatorOverviewApi: { getMine: vi.fn().mockResolvedValue({}) },
}));

const renderOverviewHook = (creatorStatus: CreatorStatus) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useCreatorOverview(creatorStatus, DEFAULT_OVERVIEW_PERIOD_DAYS), {
    wrapper,
  });
};

describe("useCreatorOverview", () => {
  beforeEach(() => {
    vi.mocked(creatorOverviewApi.getMine).mockClear();
  });

  it("loads the overview for an approved creator", async () => {
    renderOverviewHook(CreatorStatus.APPROVED);

    await waitFor(() => expect(creatorOverviewApi.getMine).toHaveBeenCalledOnce());
  });

  it("never asks for an overview when the shopper is not an approved creator", () => {
    const { result } = renderOverviewHook(CreatorStatus.NONE);

    expect(result.current.fetchStatus).toBe("idle");
    expect(creatorOverviewApi.getMine).not.toHaveBeenCalled();
  });
});
