import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { CompetitionsSection } from "./CompetitionsSection";

const API_BASE = "*/api";

const competition = {
  id: "comp-1",
  name: "Weekly Style Sprint",
  category: "MOST_LIKES",
  topN: 3,
  isActive: true,
  badge: {
    id: "badge-1",
    name: "Weekly Style Sprint",
    description: "Awarded weekly to the top 3 in Most likes.",
    icon: "🏆",
    category: "SPECIAL",
    rarity: "RARE",
    designConfig: { shape: "star", primaryColor: "#f97316" },
    xpReward: 50,
    isPermanent: true,
    isPublic: true,
    isTitleEligible: false,
  },
};

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
};

const stubCompetitions = (rows: unknown[] = []) =>
  mswServer.use(
    http.get(`${API_BASE}/creator-competitions/admin`, () =>
      HttpResponse.json({ success: true, data: rows }),
    ),
  );

describe("CompetitionsSection", () => {
  it("shows an inline message, not a browser popup, and sends nothing without a name", async () => {
    stubCompetitions();
    const createRequested = vi.fn();
    mswServer.use(
      http.post(`${API_BASE}/creator-competitions`, () => {
        createRequested();
        return HttpResponse.json({ success: true, data: competition });
      }),
    );
    const user = userEvent.setup();
    render(<CompetitionsSection />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Create competition" }));

    expect(await screen.findByText("Enter a name for the competition.")).toBeInTheDocument();
    expect(createRequested).not.toHaveBeenCalled();
  });

  it("explains a winner count above the maximum", async () => {
    stubCompetitions();
    const user = userEvent.setup();
    render(<CompetitionsSection />, { wrapper });

    const winnersField = await screen.findByLabelText("Winners each week");
    await user.clear(winnersField);
    await user.type(winnersField, "11");
    await user.click(screen.getByRole("button", { name: "Create competition" }));

    expect(await screen.findByText("Use a number up to 10.")).toBeInTheDocument();
  });

  it("creates a competition and shows a success toast", async () => {
    stubCompetitions();
    let createBody: unknown;
    mswServer.use(
      http.post(`${API_BASE}/creator-competitions`, async ({ request }) => {
        createBody = await request.json();
        return HttpResponse.json({ success: true, data: competition }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    render(<CompetitionsSection />, { wrapper });

    await user.type(await screen.findByLabelText("Competition name"), "Weekly Style Sprint");
    await user.click(screen.getByRole("button", { name: "Create competition" }));

    await waitFor(() =>
      expect(createBody).toMatchObject({
        name: "Weekly Style Sprint",
        topN: 3,
        leaderboardCategory: "MOST_LIKES",
      }),
    );
    expect(await screen.findByText("Competition created.")).toBeInTheDocument();
  });

  it("saves an edited competition and shows a success toast", async () => {
    stubCompetitions([competition]);
    mswServer.use(
      http.patch(`${API_BASE}/creator-competitions/comp-1`, () =>
        HttpResponse.json({ success: true, data: competition }),
      ),
      http.put(`${API_BASE}/creator-competitions/comp-1`, () =>
        HttpResponse.json({ success: true, data: competition }),
      ),
    );
    const user = userEvent.setup();
    render(<CompetitionsSection />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Competition updated.")).toBeInTheDocument();
  });

  it("shows the server's reason when creating fails", async () => {
    stubCompetitions();
    mswServer.use(
      http.post(`${API_BASE}/creator-competitions`, () =>
        HttpResponse.json({ success: false, message: "That name is taken." }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    render(<CompetitionsSection />, { wrapper });

    await user.type(await screen.findByLabelText("Competition name"), "Weekly Style Sprint");
    await user.click(screen.getByRole("button", { name: "Create competition" }));

    expect(await screen.findByText("That name is taken.")).toBeInTheDocument();
  });
});
