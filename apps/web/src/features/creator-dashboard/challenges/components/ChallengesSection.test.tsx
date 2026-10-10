import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useChallenges } from "../hooks/useChallenges";
import { ChallengesSection } from "./ChallengesSection";

vi.mock("../hooks/useChallenges", () => ({ useChallenges: vi.fn() }));

const refetch = vi.fn();

const mockChallenges = (overrides: Partial<ReturnType<typeof useChallenges>> = {}) => {
  vi.mocked(useChallenges).mockReturnValue({
    data: [],
    isPending: false,
    isError: false,
    error: null,
    refetch,
    ...overrides,
  } as ReturnType<typeof useChallenges>);
};

const renderSection = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChallengesSection />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  refetch.mockClear();
  mockChallenges();
});

describe("ChallengesSection", () => {
  it("shows a real error banner instead of the empty state when the challenges fetch fails", () => {
    mockChallenges({ isError: true, error: new Error("Network error"), data: undefined });
    renderSection();

    expect(screen.getByText(/Couldn't load challenges/)).toBeInTheDocument();
    expect(screen.queryByText(/No challenges are running/)).not.toBeInTheDocument();
  });

  it("retries the challenges fetch when Try again is clicked", async () => {
    mockChallenges({ isError: true, error: new Error("Network error"), data: undefined });
    renderSection();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state, not an error, when there's genuinely nothing running", () => {
    renderSection();

    expect(screen.getByText(/No challenges are running/)).toBeInTheDocument();
  });
});
