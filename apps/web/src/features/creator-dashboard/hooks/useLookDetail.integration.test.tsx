import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { useLookDetail } from "./useLookDetail";

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useLookDetail", () => {
  it("fetches the look's edit detail when given a lookId", async () => {
    mswServer.use(
      http.get("/api/creator-looks/look-1", () =>
        HttpResponse.json({
          success: true,
          message: "Post detail.",
          data: {
            id: "look-1",
            imageUrls: ["https://cdn.outfiqe.test/a.jpg"],
            caption: "A great fit",
            taggedProducts: [],
          },
        }),
      ),
    );

    const { result } = renderHook(() => useLookDetail("look-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe("look-1");
  });

  it("stays disabled and never requests anything when lookId is null", () => {
    const { result } = renderHook(() => useLookDetail(null), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
  });
});
