import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

let mockPathname = "/profile";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

const linkStatus = { pending: false };

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    onNavigate,
    prefetch: _prefetch,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    onNavigate?: () => void;
    prefetch?: boolean;
  }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onNavigate?.();
      }}
      {...rest}
    >
      {children}
    </a>
  ),
  useLinkStatus: () => linkStatus,
}));

import type { SidebarLinkRenderProps } from "@outfiqe/components";

import { DashboardSidebarLink } from "./DashboardSidebarLink";
import { SidebarPendingNavProvider } from "./SidebarPendingNavContext";

const baseProps: SidebarLinkRenderProps = {
  href: "/earnings",
  isActive: false,
  isAncestorActive: false,
  collapsed: false,
  baseClassName: "nav-base",
  activeClassName: "nav-active",
  ancestorClassName: "nav-ancestor",
  inactiveClassName: "nav-inactive",
  title: undefined,
  style: undefined,
  children: <span>Earnings</span>,
};

const renderLink = (props: Partial<SidebarLinkRenderProps> = {}) =>
  render(
    <SidebarPendingNavProvider>
      <DashboardSidebarLink {...baseProps} {...props} />
    </SidebarPendingNavProvider>,
  );

afterEach(() => {
  mockPathname = "/profile";
  linkStatus.pending = false;
  vi.clearAllMocks();
});

describe("DashboardSidebarLink", () => {
  it("marks itself active the moment it is clicked, before the route changes", () => {
    renderLink();
    const link = screen.getByRole("link", { name: "Earnings" });

    expect(link).toHaveClass("nav-inactive");
    expect(link).not.toHaveAttribute("aria-current");

    fireEvent.click(link);

    expect(link).toHaveClass("nav-active");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("renders committed active styling from isActive without a click", () => {
    renderLink({ isActive: true });
    const link = screen.getByRole("link", { name: "Earnings" });

    expect(link).toHaveClass("nav-active");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("clears the optimistic active state once the pathname catches up", () => {
    const view = renderLink();
    fireEvent.click(screen.getByRole("link", { name: "Earnings" }));
    expect(screen.getByRole("link", { name: "Earnings" })).toHaveClass("nav-active");

    mockPathname = "/earnings";
    view.rerender(
      <SidebarPendingNavProvider>
        <DashboardSidebarLink {...baseProps} isActive />
      </SidebarPendingNavProvider>,
    );

    expect(screen.getByRole("link", { name: "Earnings" })).toHaveClass("nav-active");
  });

  it("renders a cross-app href as a plain anchor with no optimistic navigation", () => {
    renderLink({ href: "/admin/crm", children: <span>CRM</span> });
    const link = screen.getByRole("link", { name: "CRM" });

    expect(link).toHaveAttribute("href", "/admin/crm");

    fireEvent.click(link);

    expect(link).not.toHaveAttribute("aria-current");
  });

  it("shows the pending dot while navigating when expanded", () => {
    linkStatus.pending = true;
    const { container } = renderLink();

    expect(container.querySelector("span[aria-hidden]")).not.toBeNull();
  });

  it("omits the pending dot when collapsed", () => {
    linkStatus.pending = true;
    const { container } = renderLink({ collapsed: true });

    expect(container.querySelector("span[aria-hidden]")).toBeNull();
  });
});
