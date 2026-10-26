import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductActionsMenu } from "./ProductActionsMenu";

const renderMenu = (overrides: Partial<Parameters<typeof ProductActionsMenu>[0]> = {}) => {
  const handlers = {
    onEdit: vi.fn(),
    onManageStock: vi.fn(),
    onManageDiscount: vi.fn(),
    onEditSizeChart: vi.fn(),
    onDelete: vi.fn(),
  };
  const view = render(
    <div data-testid="clipping-card" className="overflow-hidden">
      <ProductActionsMenu {...handlers} {...overrides} />
    </div>,
  );
  return { ...view, handlers };
};

const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "Product options" }));

describe("ProductActionsMenu", () => {
  it("keeps the options hidden until the trigger is clicked", () => {
    renderMenu();

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("renders the open menu outside the card so the card's overflow can't clip it", () => {
    renderMenu();
    openMenu();

    const menu = screen.getByRole("menu");
    expect(screen.getByTestId("clipping-card")).not.toContainElement(menu);
  });

  it("runs the chosen action and closes the menu", () => {
    const { handlers } = renderMenu();
    openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: "Manage stock" }));

    expect(handlers.onManageStock).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls the matching handler for every option", () => {
    const { handlers } = renderMenu();
    const optionHandlers = [
      ["Edit", handlers.onEdit],
      ["Sale price", handlers.onManageDiscount],
      ["Size chart", handlers.onEditSizeChart],
      ["Delete", handlers.onDelete],
    ] as const;

    for (const [optionName, optionHandler] of optionHandlers) {
      openMenu();
      fireEvent.click(screen.getByRole("menuitem", { name: optionName }));
      expect(optionHandler).toHaveBeenCalledOnce();
    }
  });

  it("leaves out the size chart option for products that don't take one", () => {
    renderMenu({ onEditSizeChart: undefined });
    openMenu();

    expect(screen.queryByRole("menuitem", { name: "Size chart" })).not.toBeInTheDocument();
  });
});
