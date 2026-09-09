import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTastePreferences } from "@/features/categories/hooks/useTastePreferences";
import { useIsHydrated } from "@/shared/hooks/useIsHydrated";

import { CategorySelectionProvider, useCategorySelection } from "./CategorySelectionContext";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ isAuthResolved: true }),
}));

vi.mock("@/features/categories/hooks/useTastePreferences", () => ({
  useTastePreferences: vi.fn(),
}));

vi.mock("@/shared/hooks/useIsHydrated", () => ({
  useIsHydrated: vi.fn(),
}));

const mockSearchParams = (params: Record<string, string>) => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(params) as ReturnType<typeof useSearchParams>,
  );
};

const mockTastePreferences = (storedSlugs: string[] | null) => {
  vi.mocked(useTastePreferences).mockReturnValue({
    storedSlugs,
    isCustomized: storedSlugs !== null,
    save: vi.fn(),
    reset: vi.fn(),
  });
};

const Consumer = () => {
  const { pendingCategorySlug, markCategoryPending, storedTasteSlugs, isTasteCustomized } =
    useCategorySelection();
  return (
    <div>
      <span>{pendingCategorySlug ? `pending:${pendingCategorySlug}` : "pending:none"}</span>
      <span>stored:{storedTasteSlugs ? storedTasteSlugs.join(",") : "none"}</span>
      <span>customized:{String(isTasteCustomized)}</span>
      <button type="button" onClick={() => markCategoryPending("dresses")}>
        select-dresses
      </button>
    </div>
  );
};

beforeEach(() => {
  mockSearchParams({ category: "tops" });
  mockTastePreferences(["client-a", "client-b"]);
  vi.mocked(useIsHydrated).mockReturnValue(true);
});

describe("CategorySelectionContext", () => {
  it("defaults to no pending selection outside of a provider, and ignores attempts to mark one pending", async () => {
    const user = userEvent.setup();
    render(<Consumer />);

    expect(screen.getByText("pending:none")).toBeInTheDocument();

    await user.click(screen.getByText("select-dresses"));
    expect(screen.getByText("pending:none")).toBeInTheDocument();
  });

  it("shares pending category selection across consumers within the same provider", async () => {
    const user = userEvent.setup();
    render(
      <CategorySelectionProvider>
        <Consumer />
      </CategorySelectionProvider>,
    );

    expect(screen.getByText("pending:none")).toBeInTheDocument();

    await user.click(screen.getByText("select-dresses"));
    expect(screen.getByText("pending:dresses")).toBeInTheDocument();
  });

  it("clears the pending selection once the URL reflects the new category", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <CategorySelectionProvider>
        <Consumer />
      </CategorySelectionProvider>,
    );

    await user.click(screen.getByText("select-dresses"));
    expect(screen.getByText("pending:dresses")).toBeInTheDocument();

    mockSearchParams({ category: "dresses" });
    rerender(
      <CategorySelectionProvider>
        <Consumer />
      </CategorySelectionProvider>,
    );

    expect(screen.getByText("pending:none")).toBeInTheDocument();
  });

  it("serves the server-resolved taste slugs until the client has hydrated", () => {
    vi.mocked(useIsHydrated).mockReturnValue(false);

    render(
      <CategorySelectionProvider serverResolvedTasteSlugs={["server-x", "server-y"]}>
        <Consumer />
      </CategorySelectionProvider>,
    );

    expect(screen.getByText("stored:server-x,server-y")).toBeInTheDocument();
    expect(screen.getByText("customized:true")).toBeInTheDocument();
  });

  it("switches to the live client taste slugs once hydrated", () => {
    vi.mocked(useIsHydrated).mockReturnValue(true);

    render(
      <CategorySelectionProvider serverResolvedTasteSlugs={["server-x"]}>
        <Consumer />
      </CategorySelectionProvider>,
    );

    expect(screen.getByText("stored:client-a,client-b")).toBeInTheDocument();
  });
});
