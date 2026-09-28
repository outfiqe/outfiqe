import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth/context/AuthContext";

import { exploreFeedApi } from "../api/exploreFeedApi";
import { useSuggestedCreators } from "./useSuggestedCreators";

vi.mock("@/features/auth/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../api/exploreFeedApi", () => ({
  exploreFeedApi: { suggestedCreators: vi.fn() },
}));

const mockAuth = (overrides: {
  isAuthenticated: boolean;
  isAuthResolved: boolean;
  isStaff: boolean;
}) => {
  vi.mocked(useAuth).mockReturnValue(overrides as ReturnType<typeof useAuth>);
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(exploreFeedApi.suggestedCreators).mockResolvedValue([]);
});

describe("useSuggestedCreators", () => {
  it("fetches suggestions for an authenticated non-admin viewer", async () => {
    mockAuth({ isAuthenticated: true, isAuthResolved: true, isStaff: false });

    renderHook(() => useSuggestedCreators(), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(exploreFeedApi.suggestedCreators).toHaveBeenCalled());
  });

  it("never fetches suggestions for an admin viewer", async () => {
    mockAuth({ isAuthenticated: true, isAuthResolved: true, isStaff: true });

    renderHook(() => useSuggestedCreators(), { wrapper: createQueryClientWrapper() });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(exploreFeedApi.suggestedCreators).not.toHaveBeenCalled();
  });

  it("does not fetch before auth has resolved", async () => {
    mockAuth({ isAuthenticated: false, isAuthResolved: false, isStaff: false });

    renderHook(() => useSuggestedCreators(), { wrapper: createQueryClientWrapper() });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(exploreFeedApi.suggestedCreators).not.toHaveBeenCalled();
  });

  it("does not fetch for a signed-out visitor", async () => {
    mockAuth({ isAuthenticated: false, isAuthResolved: true, isStaff: false });

    renderHook(() => useSuggestedCreators(), { wrapper: createQueryClientWrapper() });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(exploreFeedApi.suggestedCreators).not.toHaveBeenCalled();
  });
});
