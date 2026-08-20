import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import { useEarningsSummary } from "./useEarningsSummary";

vi.mock("@/features/auth", () => ({
  useAuth: vi.fn(),
}));

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useEarningsSummary", () => {
  it("fetches the summary when the caller is authenticated", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    mswServer.use(
      http.get("/api/commissions/me/summary", () =>
        HttpResponse.json({
          success: true,
          message: "Summary.",
          data: { totalEarnings: 12000, pending: 3000, available: 5000, paid: 4000 },
        }),
      ),
    );

    const { result } = renderHook(() => useEarningsSummary(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ totalEarnings: 12000 });
  });

  it("stays disabled and never requests the summary when unauthenticated", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useEarningsSummary(), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
  });
});
