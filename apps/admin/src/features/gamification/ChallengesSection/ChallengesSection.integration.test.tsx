import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ChallengesSection } from "./index";

const API_BASE = "*/api";

const challenge = {
  id: "challenge-1",
  name: "Summer Sprint",
  description: "Post three looks this week.",
  bannerImageUrl: null,
  isActive: true,
  badge: {
    id: "badge-1",
    name: "Sprinter",
    description: "Finished the Summer Sprint.",
    icon: "🏃",
    category: "SPECIAL",
    rarity: "RARE",
    xpReward: 100,
    designConfig: { shape: "star", primaryColor: "#f97316" },
    isPermanent: true,
    isPublic: true,
    isTitleEligible: false,
  },
  achievement: {
    id: "achievement-1",
    requirementType: "ENGAGEMENT",
    conditions: [{ metric: "posts_created", operator: "gte", value: 3 }],
    isActive: true,
    activeFrom: "2026-10-01T00:00:00.000Z",
    activeUntil: "2026-10-08T00:00:00.000Z",
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

const stubChallenges = (rows: unknown[] = []) =>
  mswServer.use(
    http.get(`${API_BASE}/challenges/admin`, () =>
      HttpResponse.json({ success: true, data: rows }),
    ),
  );

const fillValidChallenge = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(await screen.findByLabelText("Challenge name"), "Summer Sprint");
  await user.type(screen.getByLabelText("Challenge description"), "Post three looks.");
  await user.type(screen.getByLabelText("Badge name"), "Sprinter");
  await user.type(screen.getByLabelText("Icon (emoji)"), "🏃");
  await user.type(screen.getByLabelText("Badge description"), "Finished the sprint.");
  await user.type(screen.getByLabelText("Value"), "3");
};

describe("ChallengesSection", () => {
  it("shows inline messages, not a browser popup, and sends nothing for an empty challenge", async () => {
    stubChallenges();
    const createRequested = vi.fn();
    mswServer.use(
      http.post(`${API_BASE}/challenges`, () => {
        createRequested();
        return HttpResponse.json({ success: true, data: challenge });
      }),
    );
    const user = userEvent.setup();
    render(<ChallengesSection />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "New challenge" }));
    await user.click(await screen.findByRole("button", { name: "Create challenge" }));

    expect(await screen.findByText("Enter a challenge name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a challenge description.")).toBeInTheDocument();
    expect(screen.getByText("Enter a badge name.")).toBeInTheDocument();
    expect(screen.getByText("Enter an icon for the badge.")).toBeInTheDocument();
    expect(screen.getByText("Enter a value.")).toBeInTheDocument();
    expect(createRequested).not.toHaveBeenCalled();
  });

  it("clears a message as soon as its field is fixed", async () => {
    stubChallenges();
    const user = userEvent.setup();
    render(<ChallengesSection />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "New challenge" }));
    await user.click(await screen.findByRole("button", { name: "Create challenge" }));
    expect(await screen.findByText("Enter a challenge name.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Challenge name"), "Summer Sprint");

    expect(screen.queryByText("Enter a challenge name.")).not.toBeInTheDocument();
  });

  it("creates a challenge and shows a success toast", async () => {
    stubChallenges();
    let createBody: unknown;
    mswServer.use(
      http.post(`${API_BASE}/challenges`, async ({ request }) => {
        createBody = await request.json();
        return HttpResponse.json({ success: true, data: challenge }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    render(<ChallengesSection />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "New challenge" }));
    await fillValidChallenge(user);
    await user.click(screen.getByRole("button", { name: "Create challenge" }));

    await waitFor(() =>
      expect(createBody).toMatchObject({
        challengeName: "Summer Sprint",
        name: "Sprinter",
        conditions: [{ metric: "total_likes", operator: "gte", value: 3 }],
      }),
    );
    expect(await screen.findByText("Challenge created.")).toBeInTheDocument();
  });

  it("saves an edited challenge and shows a success toast", async () => {
    stubChallenges([challenge]);
    mswServer.use(
      http.patch(`${API_BASE}/challenges/challenge-1`, () =>
        HttpResponse.json({ success: true, data: challenge }),
      ),
    );
    const user = userEvent.setup();
    render(<ChallengesSection />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    await user.click(await screen.findByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Challenge updated.")).toBeInTheDocument();
  });
});
