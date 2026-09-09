import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import type { TagReport } from "@/features/tag-reports/schemas";
import { TagReportsPage } from "@/features/tag-reports/TagReportsPage";

const API_BASE = "http://localhost:3000/api";

const aReport = (overrides: Partial<TagReport> = {}): TagReport => ({
  id: "report-1",
  source: "PUBLIC_REPORT",
  reason: "COUNTERFEIT",
  note: "Logo stitching is off.",
  status: "OPEN",
  createdAt: "2026-09-08T00:00:00.000Z",
  reviewedAt: null,
  resolutionNote: null,
  reporterName: null,
  tag: {
    id: "tag-1",
    lookId: "look-1",
    lookImageUrl: "https://cdn.test/look-1.jpg",
    reviewStatus: "APPROVED",
    sizeWorn: "M",
    product: {
      id: "product-1",
      name: "Contested Coat",
      brandId: "brand-1",
      brandName: "Studio Nine",
    },
    creator: { id: "creator-1", name: "Asha Rai", handle: "asharai", counterfeitFlagCount: 3 },
  },
  ...overrides,
});

const stub = (openItems: TagReport[]) => {
  mswServer.use(
    http.get(`${API_BASE}/tag-reports/open-count`, () =>
      HttpResponse.json({ success: true, message: "ok", data: { openCount: openItems.length } }),
    ),
    http.get(`${API_BASE}/tag-reports`, ({ request }) => {
      const status = new URL(request.url).searchParams.get("status");
      return HttpResponse.json({
        success: true,
        message: "ok",
        data: { items: status === "OPEN" || !status ? openItems : [], nextCursor: null },
      });
    }),
  );
};

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<TagReportsPage />, { wrapper });
};

describe("TagReportsPage", () => {
  it("lists an open report with the creator's counterfeit flag count", async () => {
    stub([aReport()]);
    renderPage();

    expect(await screen.findByText("Contested Coat")).toBeInTheDocument();
    expect(screen.getByText("3 counterfeit flags")).toBeInTheDocument();
    expect(screen.getByText(/Logo stitching is off\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open (1)" })).toBeInTheDocument();
    expect(screen.getByText(/1 open\./)).toBeInTheDocument();
  });

  it("resolves a report as actioned and takes the tag down", async () => {
    let body: unknown;
    stub([aReport()]);
    mswServer.use(
      http.post(`${API_BASE}/tag-reports/report-1/resolve`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: { tagTakenDown: true },
        });
      }),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Resolve" }));

    const dialog = await screen.findByRole("dialog");
    await userEvent.type(
      within(dialog).getByLabelText(/Resolution note/),
      "Confirmed fake, removed.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Resolve" }));

    await waitFor(() =>
      expect(body).toEqual({
        status: "ACTIONED",
        resolutionNote: "Confirmed fake, removed.",
        takeDownTag: true,
      }),
    );
  });

  it("hides the take-down option once the tag is already gone", async () => {
    stub([aReport({ tag: { ...aReport().tag, reviewStatus: "REJECTED" } })]);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Resolve" }));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).queryByText(/Remove this tag/)).not.toBeInTheDocument();
    expect(within(dialog).getByText(/already rejected/)).toBeInTheDocument();
  });
});
