import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { ContentReportsPage } from "@/features/content-reports/ContentReportsPage";
import type { ContentReport } from "@/features/content-reports/schemas";

const API_BASE = "http://localhost:3000/api";

const aReport = (overrides: Partial<ContentReport> = {}): ContentReport => ({
  id: "report-1",
  targetType: "CREATOR_LOOK",
  targetId: "look-1",
  reason: "SPAM",
  note: "This is a bot post.",
  status: "OPEN",
  createdAt: "2026-09-08T00:00:00.000Z",
  resolvedAt: null,
  resolutionNote: null,
  reporterName: null,
  target: {
    lookId: "look-1",
    imageUrl: "https://cdn.test/look-1.jpg",
    snippet: "Buy followers at cheapfollowers.test",
    isRemoved: false,
    author: { id: "creator-1", name: "Asha Rai", handle: "asharai", contentFlagCount: 2 },
  },
  ...overrides,
});

const stub = (openItems: ContentReport[]) => {
  mswServer.use(
    http.get(`${API_BASE}/content-reports/open-count`, () =>
      HttpResponse.json({ success: true, message: "ok", data: { openCount: openItems.length } }),
    ),
    http.get(`${API_BASE}/content-reports`, ({ request }) => {
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
  return render(<ContentReportsPage />, { wrapper });
};

describe("ContentReportsPage", () => {
  it("lists an open report with the target preview and prior-removal count", async () => {
    stub([aReport()]);
    renderPage();

    expect(await screen.findByText(/Buy followers at cheapfollowers\.test/)).toBeInTheDocument();
    expect(screen.getByText("2 prior removals")).toBeInTheDocument();
    expect(screen.getByText(/This is a bot post\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open (1)" })).toBeInTheDocument();
    expect(screen.getByText(/1 open\./)).toBeInTheDocument();
  });

  it("resolves a report by removing the content", async () => {
    let body: unknown;
    stub([aReport()]);
    mswServer.use(
      http.post(`${API_BASE}/content-reports/report-1/resolve`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ success: true, message: "ok", data: { contentRemoved: true } });
      }),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Resolve" }));

    const dialog = await screen.findByRole("dialog");
    await userEvent.type(
      within(dialog).getByLabelText(/Resolution note/),
      "Confirmed spam, removed.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Resolve" }));

    await waitFor(() =>
      expect(body).toEqual({ action: "REMOVE_CONTENT", note: "Confirmed spam, removed." }),
    );
  });

  it("disables the remove-content option once the content is already gone", async () => {
    stub([aReport({ target: { ...aReport().target!, isRemoved: true } })]);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Resolve" }));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByRole("radio", { name: /Remove content/ })).toBeDisabled();
    expect(within(dialog).getByText(/already been removed/)).toBeInTheDocument();
  });

  it("shows a fallback when the reported content no longer exists at all", async () => {
    stub([aReport({ target: null })]);
    renderPage();

    expect(await screen.findByText(/no longer exists/)).toBeInTheDocument();
  });
});
