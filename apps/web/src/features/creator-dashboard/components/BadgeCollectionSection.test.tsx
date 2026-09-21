import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBadgeCollection } from "../hooks/useBadgeCollection";
import { BadgeCollectionSection } from "./BadgeCollectionSection";

vi.mock("../hooks/useBadgeCollection", () => ({ useBadgeCollection: vi.fn() }));
vi.mock("../hooks/useUpdateFeaturedBadges", () => ({
  useUpdateFeaturedBadges: () => ({ mutate: vi.fn() }),
}));

const refetch = vi.fn();

const mockCollection = (overrides: Partial<ReturnType<typeof useBadgeCollection>> = {}) => {
  vi.mocked(useBadgeCollection).mockReturnValue({
    data: [],
    isPending: false,
    isError: false,
    error: null,
    refetch,
    ...overrides,
  } as ReturnType<typeof useBadgeCollection>);
};

const renderSection = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BadgeCollectionSection />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  refetch.mockClear();
  mockCollection();
});

describe("BadgeCollectionSection", () => {
  it("shows a real error banner instead of the empty state when the collection fetch fails", () => {
    mockCollection({ isError: true, error: new Error("Network error"), data: undefined });
    renderSection();

    expect(screen.getByText(/Couldn't load your badge collection/)).toBeInTheDocument();
    expect(screen.queryByText(/No badges match this filter/)).not.toBeInTheDocument();
  });

  it("retries the collection fetch when Try again is clicked", async () => {
    mockCollection({ isError: true, error: new Error("Network error"), data: undefined });
    renderSection();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state, not an error, when there's genuinely nothing to show", () => {
    renderSection();

    expect(screen.getByText(/No badges match this filter/)).toBeInTheDocument();
  });

  it("does not show a 0 / 0 progress line when there are no badges to collect", () => {
    renderSection();

    expect(screen.queryByText(/collected/)).not.toBeInTheDocument();
  });

  it("does not show a 0 / 0 progress line when the collection failed to load", () => {
    mockCollection({ isError: true, error: new Error("Network error"), data: undefined });
    renderSection();

    expect(screen.queryByText(/collected/)).not.toBeInTheDocument();
  });
});
