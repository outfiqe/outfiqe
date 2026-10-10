import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { OutfitBuildsPage } from "./OutfitBuildsPage";

const BUILDS_URL = "http://localhost:3000/api/platform/builds";

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const build = (overrides: Record<string, unknown> = {}) => ({
  id: "outfit-1",
  title: "Dashain set",
  status: "LOCKED",
  visibility: "PUBLIC",
  version: 6,
  owner: { id: "user-1", name: "Sita Rai", handle: "sita", avatarUrl: null },
  memberCount: 3,
  itemCount: 4,
  photoCount: 2,
  likeCount: 9,
  commentCount: 1,
  isStartedInChat: true,
  removedAt: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-04T10:00:00.000Z",
  ...overrides,
});

const metrics = {
  weeks: [
    {
      weekStart: "2026-09-28T00:00:00.000Z",
      buildsStartedAlone: 5,
      buildsStartedFromChat: 2,
      buildsLocked: 3,
      buildsMadePublic: 1,
      comments: 4,
      likes: 12,
      saves: 6,
      fullSetOrders: 2,
      pickedItemOrders: 7,
    },
  ],
  sharedBuildCount: 4,
  publicBuildCount: 3,
  commissionByTier: [
    {
      scope: "OUTFIT_BUILD",
      tierId: "tier-1",
      minPrice: 0,
      maxPrice: 4_999,
      amount: 100,
      commissionCount: 2,
      totalAmount: 200,
    },
  ],
};

describe("OutfitBuildsPage", () => {
  it("lists builds and searches by title, status and visibility", async () => {
    const requestedQueries: string[] = [];
    mswServer.use(
      http.get(BUILDS_URL, ({ request }) => {
        requestedQueries.push(new URL(request.url).search);
        return okJson({ items: [build()], nextCursor: null });
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(<OutfitBuildsPage />, { path: "/outfit-builds" });

    expect(await screen.findByRole("link", { name: /Dashain set/ })).toHaveAttribute(
      "href",
      "/outfit-builds/outfit-1",
    );
    expect(screen.getByText(/Sita Rai \(@sita\)/)).toBeInTheDocument();
    expect(screen.getByText(/started in a chat/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Title or owner"), "dashain");
    await user.selectOptions(screen.getByLabelText("Status"), "LOCKED");
    await user.selectOptions(screen.getByLabelText("Who can see it"), "PUBLIC");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() =>
      expect(requestedQueries.at(-1)).toBe("?search=dashain&status=LOCKED&visibility=PUBLIC"),
    );
  });

  it("says so when no build matches", async () => {
    mswServer.use(http.get(BUILDS_URL, () => okJson({ items: [], nextCursor: null })));
    renderWithRouter(<OutfitBuildsPage />, { path: "/outfit-builds" });

    expect(await screen.findByText("No builds match.")).toBeInTheDocument();
  });

  it("shows the weekly numbers and commission at each rate on the Metrics tab", async () => {
    const requestedWeeks: (string | null)[] = [];
    mswServer.use(
      http.get(BUILDS_URL, () => okJson({ items: [], nextCursor: null })),
      http.get(`${BUILDS_URL}/metrics`, ({ request }) => {
        requestedWeeks.push(new URL(request.url).searchParams.get("weeks"));
        return okJson(metrics);
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(<OutfitBuildsPage />, { path: "/outfit-builds" });

    await user.click(await screen.findByRole("tab", { name: "Metrics" }));

    expect(
      await screen.findByText("Right now 4 builds are shared and 3 are public."),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "7" })).toBeInTheDocument();
    expect(screen.getByText(/Rs. 0–4999 pays Rs. 100/)).toBeInTheDocument();
    expect(requestedWeeks).toContain("12");

    await user.selectOptions(screen.getByLabelText("Period"), "52");
    await waitFor(() => expect(requestedWeeks).toContain("52"));
  });
});
