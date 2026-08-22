import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { badgeApi } from "../api/badgeApi";
import type { BadgeCollectionEntry } from "../api/badgeSchemas";
import { AchievementBadgeCard } from "./AchievementBadgeCard";

vi.mock("../api/badgeApi", () => ({
  badgeApi: {
    updateDisplay: vi.fn().mockResolvedValue(undefined),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "QueryClientTestWrapper";

  return Wrapper;
};

const baseEntry: BadgeCollectionEntry = {
  id: "badge-1",
  name: "Trailblazer",
  description: "Posted 10 looks.",
  category: "CREATOR",
  rarity: "COMMON",
  icon: "🏆",
  designConfig: { shape: "circle", primaryColor: "#f97316" },
  isPermanent: true,
  isCollected: true,
  unlockedAt: "2026-08-01T00:00:00.000Z",
  isDisplayed: true,
  isFeatured: false,
  displayOrder: null,
  isDynamicallyActive: null,
  progress: null,
  sponsorBrand: null,
};

const renderCard = (
  entry: BadgeCollectionEntry,
  overrides: Partial<{ isFeaturable: boolean; onToggleFeatured: (badgeId: string) => void }> = {},
) =>
  render(
    <AchievementBadgeCard
      entry={entry}
      isFeaturable={overrides.isFeaturable ?? true}
      onToggleFeatured={overrides.onToggleFeatured ?? (() => {})}
    />,
    { wrapper: createWrapper() },
  );

describe("AchievementBadgeCard", () => {
  it("shows a sponsor credit link when the badge has a sponsor brand", () => {
    renderCard({
      ...baseEntry,
      sponsorBrand: { id: "brand-1", name: "Nike", avatarUrl: null },
    });

    const link = screen.getByRole("link", { name: "Sponsored by Nike" });
    expect(link).toHaveAttribute("href", "/brand/brand-1");
  });

  it("shows no sponsor credit when the badge has no sponsor brand", () => {
    renderCard(baseEntry);

    expect(screen.queryByText(/Sponsored by/)).not.toBeInTheDocument();
  });

  it("shows the unlocked date for a collected badge", () => {
    renderCard(baseEntry);

    expect(screen.getByText(/Unlocked/)).toBeInTheDocument();
  });

  it("shows the dynamic-inactive note only when isDynamicallyActive is exactly false", () => {
    renderCard({ ...baseEntry, isDynamicallyActive: false });
    expect(screen.getByText(/Not currently active/)).toBeInTheDocument();
  });

  it("does not show the dynamic-inactive note when isDynamicallyActive is null", () => {
    renderCard({ ...baseEntry, isDynamicallyActive: null });
    expect(screen.queryByText(/Not currently active/)).not.toBeInTheDocument();
  });

  it("renders a progress bar for a locked badge with a counter-metric condition", () => {
    renderCard({
      ...baseEntry,
      isCollected: false,
      unlockedAt: null,
      isDisplayed: null,
      isFeatured: null,
      progress: [{ metric: "posts_created", operator: "gte", value: 10, currentValue: 3 }],
    });

    expect(screen.getByText("3 / 10")).toBeInTheDocument();
  });

  it("renders rank text, not a progress bar, for a locked badge with a rank-metric condition", () => {
    renderCard({
      ...baseEntry,
      isCollected: false,
      unlockedAt: null,
      isDisplayed: null,
      isFeatured: null,
      progress: [{ metric: "top_xp_rank", operator: "lte", value: 10, currentValue: 42 }],
    });

    expect(screen.getByText(/currently #42/)).toBeInTheDocument();
  });

  it("shows the admin-award fallback text for a locked badge with no progress", () => {
    renderCard({
      ...baseEntry,
      isCollected: false,
      unlockedAt: null,
      isDisplayed: null,
      isFeatured: null,
      progress: null,
    });

    expect(screen.getByText("Awarded by the Outfiqe team.")).toBeInTheDocument();
  });

  it("toggles display visibility for a collected badge", async () => {
    const user = userEvent.setup();
    renderCard({ ...baseEntry, isDisplayed: true });

    await user.click(screen.getByRole("button", { name: "Hide from profile" }));

    expect(badgeApi.updateDisplay).toHaveBeenCalledWith("badge-1", false);
  });

  it("calls onToggleFeatured when the feature button is clicked", async () => {
    const user = userEvent.setup();
    const onToggleFeatured = vi.fn();
    renderCard({ ...baseEntry, isFeatured: false }, { onToggleFeatured });

    await user.click(screen.getByRole("button", { name: "Feature" }));

    expect(onToggleFeatured).toHaveBeenCalledWith("badge-1");
  });

  it("disables the feature button when not featurable and not already featured", () => {
    renderCard({ ...baseEntry, isFeatured: false }, { isFeaturable: false });

    expect(screen.getByRole("button", { name: "Feature" })).toBeDisabled();
  });

  it("keeps the feature button enabled to allow unfeaturing even when not featurable", () => {
    renderCard({ ...baseEntry, isFeatured: true }, { isFeaturable: false });

    expect(screen.getByRole("button", { name: "Unfeature" })).toBeEnabled();
  });
});
