import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CategorySelectionProvider, useCategorySelection } from "./CategorySelectionContext";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

const mockSearchParams = (params: Record<string, string>) => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(params) as ReturnType<typeof useSearchParams>,
  );
};

const Consumer = () => {
  const { pendingCategorySlug, markCategoryPending } = useCategorySelection();
  return (
    <div>
      <span>{pendingCategorySlug ? `pending:${pendingCategorySlug}` : "pending:none"}</span>
      <button type="button" onClick={() => markCategoryPending("dresses")}>
        select-dresses
      </button>
    </div>
  );
};

beforeEach(() => {
  mockSearchParams({ category: "tops" });
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
});
