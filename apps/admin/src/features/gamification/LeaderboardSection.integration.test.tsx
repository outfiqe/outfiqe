import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { LeaderboardSection } from "./LeaderboardSection";

const API_BASE = "*/api";

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const stubCategories = () => {
  mswServer.use(
    http.get(`${API_BASE}/creator-leaderboard/categories`, () =>
      HttpResponse.json({
        success: true,
        data: [
          { category: "TOP_XP", enabled: true },
          { category: "MOST_LIKES", enabled: false },
        ],
      }),
    ),
  );
};

const getCategoryToggle = (label: string) => {
  const row = screen.getByText(label).closest("label");
  if (!row) throw new Error(`No toggle row for "${label}"`);
  return within(row).getByRole("checkbox");
};

describe("LeaderboardSection", () => {
  it("renders skeleton rows until the categories resolve", () => {
    stubCategories();

    const { container } = render(<LeaderboardSection />, { wrapper });

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(5);
  });

  it("renders a labelled toggle per category once loaded", async () => {
    stubCategories();

    const { container } = render(<LeaderboardSection />, { wrapper });

    expect(await screen.findByText("Top XP")).toBeInTheDocument();
    expect(screen.getByText("Most Likes")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(0);

    expect(getCategoryToggle("Top XP")).toBeChecked();
    expect(getCategoryToggle("Most Likes")).not.toBeChecked();
  });

  it("sends the new enabled state when a toggle is flipped", async () => {
    const user = userEvent.setup();
    const patchBody = vi.fn();
    stubCategories();
    mswServer.use(
      http.patch(`${API_BASE}/creator-leaderboard/categories/MOST_LIKES`, async ({ request }) => {
        patchBody(await request.json());
        return HttpResponse.json({
          success: true,
          data: { category: "MOST_LIKES", enabled: true },
        });
      }),
    );

    render(<LeaderboardSection />, { wrapper });

    await screen.findByText("Most Likes");
    await user.click(getCategoryToggle("Most Likes"));

    await waitFor(() => expect(patchBody).toHaveBeenCalledWith({ enabled: true }));
  });

  it("surfaces an error banner when the update fails", async () => {
    const user = userEvent.setup();
    stubCategories();
    mswServer.use(
      http.patch(
        `${API_BASE}/creator-leaderboard/categories/MOST_LIKES`,
        () =>
          new HttpResponse(JSON.stringify({ success: false, message: "Update rejected" }), {
            status: 500,
          }),
      ),
    );

    render(<LeaderboardSection />, { wrapper });

    await screen.findByText("Most Likes");
    await user.click(getCategoryToggle("Most Likes"));

    expect(await screen.findByText("Update rejected")).toBeInTheDocument();
  });
});
