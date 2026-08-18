import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { brandApplicationsApi } from "@/features/brand-applications/api";
import { useInfiniteBrandApplications } from "@/features/brand-applications/hooks/useInfiniteBrandApplications";

import { mswServer } from "../../msw/server";

const API_BASE = "http://localhost:4000/api";

const buildApplication = (id: string) => ({
  id,
  brandName: `Brand ${id}`,
  contactName: "Jordan Lee",
  email: `${id}@outfiqe.test`,
  phone: "9800000000",
  instagram: "@brand",
  makesOwnPieces: "MAKES",
  status: "PENDING",
  reviewedAt: null,
  reviewedById: null,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useInfiniteBrandApplications", () => {
  it("fetches pending applications filtered by status", async () => {
    mswServer.use(
      http.get(`${API_BASE}/brand-applications`, ({ request }) => {
        const status = new URL(request.url).searchParams.get("status");
        expect(status).toBe("PENDING");

        return HttpResponse.json({
          success: true,
          message: "ok",
          data: { applications: [buildApplication("app-1")], nextCursor: null },
        });
      }),
    );

    const { result } = renderHook(() => useInfiniteBrandApplications("PENDING"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]?.applications).toHaveLength(1);
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe("brandApplicationsApi.approve", () => {
  it("posts to the approve endpoint for the given application id", async () => {
    let requestedId: string | readonly string[] | undefined;
    mswServer.use(
      http.post(`${API_BASE}/brand-applications/:id/approve`, ({ params }) => {
        requestedId = params.id;
        return HttpResponse.json({ success: true, message: "Application approved.", data: null });
      }),
    );

    await brandApplicationsApi.approve("app-1");

    expect(requestedId).toBe("app-1");
  });
});

describe("brandApplicationsApi.reject", () => {
  it("posts a reason when one is given", async () => {
    let requestedBody: unknown;
    mswServer.use(
      http.post(`${API_BASE}/brand-applications/:id/reject`, async ({ request }) => {
        requestedBody = await request.json();
        return HttpResponse.json({ success: true, message: "Application rejected.", data: null });
      }),
    );

    await brandApplicationsApi.reject("app-1", "Not a fit right now.");

    expect(requestedBody).toEqual({ reason: "Not a fit right now." });
  });

  it("posts no body when no reason is given", async () => {
    let requestedBody: unknown;
    mswServer.use(
      http.post(`${API_BASE}/brand-applications/:id/reject`, async ({ request }) => {
        requestedBody = await request.text();
        return HttpResponse.json({ success: true, message: "Application rejected.", data: null });
      }),
    );

    await brandApplicationsApi.reject("app-1");

    expect(requestedBody).toBe("");
  });
});

describe("brandApplicationsApi.list", () => {
  it("omits the query string when no status or cursor is given", async () => {
    let requestedUrl = "";
    mswServer.use(
      http.get(`${API_BASE}/brand-applications`, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: { applications: [], nextCursor: null },
        });
      }),
    );

    await brandApplicationsApi.list();

    expect(requestedUrl).toBe(`${API_BASE}/brand-applications`);
  });

  it("includes both status and cursor in the query string when given", async () => {
    let requestedUrl = "";
    mswServer.use(
      http.get(`${API_BASE}/brand-applications`, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: { applications: [], nextCursor: null },
        });
      }),
    );

    await brandApplicationsApi.list("APPROVED", "cursor-1");

    const url = new URL(requestedUrl);
    expect(url.searchParams.get("status")).toBe("APPROVED");
    expect(url.searchParams.get("cursor")).toBe("cursor-1");
  });
});
