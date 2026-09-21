import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SidebarNavItemView } from "./SidebarNavItemView";
import type { SidebarLinkRenderProps, SidebarNavigationAdapter, SidebarNavItem } from "./types";
import type { ExpandedGroups } from "./useExpandedGroups";

const PRODUCTS_ITEM: SidebarNavItem = { id: "products", href: "/products", label: "Products" };

const CATALOG_GROUP: SidebarNavItem = {
  id: "catalog",
  href: "/catalog",
  label: "Catalog",
  items: [{ id: "shoes", href: "/catalog/shoes", label: "Shoes" }],
};

type RenderOptions = {
  item?: SidebarNavItem;
  navigation?: Partial<SidebarNavigationAdapter>;
  collapsed?: boolean;
  depth?: number;
  isGroupExpanded?: boolean;
};

const renderNavItem = ({
  item = PRODUCTS_ITEM,
  navigation = {},
  collapsed = false,
  depth = 0,
  isGroupExpanded = true,
}: RenderOptions = {}) => {
  const navigate = vi.fn();
  const toggle = vi.fn();
  const clickPreventedByItem: boolean[] = [];
  const expandedGroups: ExpandedGroups = { isExpanded: () => isGroupExpanded, toggle };
  const rendered = render(
    <ul
      onClick={(event) => {
        clickPreventedByItem.push(event.defaultPrevented);
        event.preventDefault();
      }}
    >
      <SidebarNavItemView
        item={item}
        depth={depth}
        navigation={{ pathname: "/overview", navigate, ...navigation }}
        expandedGroups={expandedGroups}
        collapsed={collapsed}
      />
    </ul>,
  );
  return {
    ...rendered,
    navigate,
    toggle,
    wasLastClickPreventedByItem: () => clickPreventedByItem.at(-1),
  };
};

describe("SidebarNavItemView", () => {
  describe("anchor marker", () => {
    it("marks a plain nav row with its item id so other UI can point at it", () => {
      const { container } = renderNavItem();

      const row = container.querySelector('[data-sidebar-item-id="products"]');
      expect(row?.tagName).toBe("LI");
      expect(row).toContainElement(screen.getByRole("link", { name: "Products" }));
    });

    it("marks a nav group with its own id and each child with the child's id", () => {
      const { container } = renderNavItem({ item: CATALOG_GROUP });

      const group = container.querySelector('[data-sidebar-item-id="catalog"]');
      const child = container.querySelector('[data-sidebar-item-id="shoes"]');
      expect(group).toContainElement(child as HTMLElement);
    });
  });

  describe("plain link", () => {
    it("navigates in-app on a plain left click instead of following the href", () => {
      const { navigate, wasLastClickPreventedByItem } = renderNavItem();

      fireEvent.click(screen.getByRole("link", { name: "Products" }));

      expect(wasLastClickPreventedByItem()).toBe(true);
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/products");
    });

    it.each([
      { ctrlKey: true },
      { metaKey: true },
      { shiftKey: true },
      { altKey: true },
      { button: 1 },
    ])("lets the browser handle a modified click %o", (modifier) => {
      const { navigate, wasLastClickPreventedByItem } = renderNavItem();

      fireEvent.click(screen.getByRole("link", { name: "Products" }), modifier);

      expect(wasLastClickPreventedByItem()).toBe(false);
      expect(navigate).not.toHaveBeenCalled();
    });

    it("marks the current page and leaves other links unmarked", () => {
      renderNavItem({ navigation: { pathname: "/products" } });

      expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    it("does not mark a link for a different page as current", () => {
      renderNavItem();

      expect(screen.getByRole("link", { name: "Products" })).not.toHaveAttribute("aria-current");
    });

    it("uses the adapter's own active check when it has one", () => {
      renderNavItem({ navigation: { isActive: () => true } });

      expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    it("shows the label as a tooltip and hides it visually when collapsed", () => {
      renderNavItem({ collapsed: true });

      const link = screen.getByRole("link", { name: "Products" });
      expect(link).toHaveAttribute("title", "Products");
      expect(screen.getByText("Products")).toHaveClass("sr-only");
    });

    it("indents a nested link by its depth, but not when collapsed", () => {
      const { unmount } = renderNavItem({ depth: 1 });
      expect(screen.getByRole("link", { name: "Products" })).toHaveStyle({
        paddingLeft: "calc(0.875rem + 0.875rem)",
      });
      unmount();

      renderNavItem({ depth: 1, collapsed: true });
      expect(screen.getByRole("link", { name: "Products" }).style.paddingLeft).toBe("");
    });
  });

  describe("custom link component", () => {
    const CustomLink = ({
      href,
      isActive,
      isAncestorActive,
      title,
      children,
    }: SidebarLinkRenderProps) => (
      <a
        href={href}
        title={title}
        data-active={isActive}
        data-ancestor-active={isAncestorActive}
        data-testid="custom-link"
      >
        {children}
      </a>
    );

    it("renders through the adapter's link component", () => {
      renderNavItem({ navigation: { LinkComponent: CustomLink, pathname: "/products" } });

      expect(screen.getByTestId("custom-link")).toHaveAttribute("data-active", "true");
    });

    it("tells the link component when a child page is the active one", () => {
      renderNavItem({
        item: CATALOG_GROUP,
        navigation: { LinkComponent: CustomLink, pathname: "/catalog/shoes" },
      });

      const [groupLink] = screen.getAllByTestId("custom-link");
      expect(groupLink).toHaveAttribute("data-ancestor-active", "true");
      expect(groupLink).toHaveAttribute("data-active", "false");
    });
  });

  describe("group", () => {
    it("shows its children and an accessible Collapse control when expanded", () => {
      renderNavItem({ item: CATALOG_GROUP });

      expect(screen.getByRole("button", { name: "Collapse Catalog" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      expect(screen.getByRole("link", { name: "Shoes" })).toBeVisible();
    });

    it("hides its children and offers Expand when collapsed by the user", () => {
      renderNavItem({ item: CATALOG_GROUP, isGroupExpanded: false });

      expect(screen.getByRole("button", { name: "Expand Catalog" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(screen.queryByRole("link", { name: "Shoes" })).not.toBeInTheDocument();
    });

    it("toggles the group by its id", () => {
      const { toggle } = renderNavItem({ item: CATALOG_GROUP });

      fireEvent.click(screen.getByRole("button", { name: "Collapse Catalog" }));

      expect(toggle).toHaveBeenCalledExactlyOnceWith("catalog");
    });

    it("renders no toggle or children when the whole sidebar is collapsed", () => {
      renderNavItem({ item: CATALOG_GROUP, collapsed: true });

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Shoes" })).not.toBeInTheDocument();
    });
  });
});
