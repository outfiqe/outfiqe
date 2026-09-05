import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useCategories } from "@/features/categories/hooks/useCategories";
import { useTastePreferences } from "@/features/categories/hooks/useTastePreferences";

import { TasteCategories } from "./index";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/categories/hooks/useCategories", () => ({ useCategories: vi.fn() }));
vi.mock("@/features/categories/hooks/useTastePreferences", () => ({
  useTastePreferences: vi.fn(),
}));

const buildCategory = (slug: string, name: string) => ({
  id: slug,
  slug,
  name,
  imageUrl: null,
  productCount: 0,
});

const buildQuerySuccessResult = <TData,>(data: TData) => ({
  data,
  dataUpdatedAt: 0,
  error: null,
  errorUpdatedAt: 0,
  failureCount: 0,
  failureReason: null,
  errorUpdateCount: 0,
  isError: false as const,
  isFetched: true,
  isFetchedAfterMount: true,
  isFetching: false,
  isLoading: false as const,
  isPending: false as const,
  isLoadingError: false as const,
  isInitialLoading: false,
  isPaused: false,
  isPlaceholderData: false as const,
  isRefetchError: false as const,
  isRefetching: false,
  isStale: false,
  isSuccess: true as const,
  isEnabled: true,
  refetch: vi.fn(),
  status: "success" as const,
  fetchStatus: "idle" as const,
  promise: Promise.resolve(data),
});

const buildQueryLoadingResult = () => ({
  data: undefined,
  dataUpdatedAt: 0,
  error: null,
  errorUpdatedAt: 0,
  failureCount: 0,
  failureReason: null,
  errorUpdateCount: 0,
  isError: false as const,
  isFetched: false,
  isFetchedAfterMount: false,
  isFetching: true,
  isLoading: true as const,
  isPending: true as const,
  isLoadingError: false as const,
  isInitialLoading: true,
  isPaused: false,
  isPlaceholderData: false as const,
  isRefetchError: false as const,
  isRefetching: false,
  isStale: true,
  isSuccess: false as const,
  isEnabled: true,
  refetch: vi.fn(),
  status: "pending" as const,
  fetchStatus: "fetching" as const,
  promise: new Promise(() => {}),
});

const mockTastePreferences = () => {
  vi.mocked(useTastePreferences).mockReturnValue({
    storedSlugs: null,
    isCustomized: false,
    save: vi.fn(),
    reset: vi.fn(),
  });
};

describe("TasteCategories", () => {
  it("clips the loading skeleton so it never becomes a scrollable, scrollbar-showing row", () => {
    mockTastePreferences();
    vi.mocked(useCategories).mockReturnValue(
      buildQueryLoadingResult() as ReturnType<typeof useCategories>,
    );

    const { container } = render(<TasteCategories />);

    const skeletonRow = container.querySelector(".overflow-hidden");
    expect(skeletonRow).toBeInTheDocument();
    expect(skeletonRow).not.toHaveClass("overflow-x-auto");
    expect(container.querySelector(".overflow-x-auto")).not.toBeInTheDocument();
  });

  it("shows the loaded, scrollable categories once data arrives", () => {
    mockTastePreferences();
    vi.mocked(useCategories).mockReturnValue(
      buildQuerySuccessResult([
        buildCategory("formal", "Formal"),
        buildCategory("casual", "Casual"),
      ]) as ReturnType<typeof useCategories>,
    );

    render(<TasteCategories />);

    expect(screen.getByRole("button", { name: "Formal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Casual" })).toBeInTheDocument();
  });

  it("shows an empty state when there are no categories", () => {
    mockTastePreferences();
    vi.mocked(useCategories).mockReturnValue(
      buildQuerySuccessResult([]) as ReturnType<typeof useCategories>,
    );

    render(<TasteCategories />);

    expect(screen.getByText("No categories yet — check back soon.")).toBeInTheDocument();
  });
});
