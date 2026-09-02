import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { TeamPage } from "./TeamPage";

const API_BASE = "http://localhost:3000/api";

const invite = (overrides: Partial<Record<string, unknown>>) => ({
  id: "invite-1",
  email: "someone@outfiqe.test",
  name: "Someone",
  status: "ACCEPTED",
  isCoFounder: false,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  ...overrides,
});

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <TeamPage />
    </QueryClientProvider>,
  );
};

describe("TeamPage", () => {
  it("shows a Co-founder badge only on the rows whose account is a co-founder", async () => {
    mswServer.use(
      http.get(`${API_BASE}/admin/invites`, () =>
        HttpResponse.json({
          success: true,
          message: "Invites.",
          data: [
            invite({
              id: "cf",
              name: "Prapti Bidari",
              email: "prapti@outfiqe.com",
              isCoFounder: true,
            }),
            invite({ id: "plain", name: "Regular Admin", email: "regular@outfiqe.com" }),
          ],
        }),
      ),
    );

    renderPage();

    const coFounderRow = (await screen.findByText("Prapti Bidari")).closest("div");
    const plainRow = screen.getByText("Regular Admin").closest("div");

    expect(within(coFounderRow as HTMLElement).getByText("Co-founder")).toBeInTheDocument();
    expect(within(plainRow as HTMLElement).queryByText("Co-founder")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no invites", async () => {
    mswServer.use(
      http.get(`${API_BASE}/admin/invites`, () =>
        HttpResponse.json({ success: true, message: "Invites.", data: [] }),
      ),
    );

    renderPage();

    expect(await screen.findByText("No invites yet.")).toBeInTheDocument();
  });
});
