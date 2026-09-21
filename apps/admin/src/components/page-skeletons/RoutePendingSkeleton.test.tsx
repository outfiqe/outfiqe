import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RoutePendingSkeleton } from "./RoutePendingSkeleton";

const routerState = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: routerState.pathname } }),
}));

beforeEach(() => {
  routerState.pathname = "/";
});

describe("RoutePendingSkeleton", () => {
  it("shows the list skeleton with filter chips for a list page", () => {
    routerState.pathname = "/admin/orders";

    const { container } = render(<RoutePendingSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading page");
    expect(container.querySelectorAll(".rounded-full").length).toBeGreaterThan(0);
  });

  it("shows the pipeline heading and description above the board while the pipeline loads", () => {
    routerState.pathname = "/admin/crm/pipeline";

    render(<RoutePendingSkeleton />);

    expect(screen.getByRole("heading", { level: 1, name: "Pipeline" })).toBeInTheDocument();
    expect(screen.getByText(/follow every deal from first contact/i)).toBeInTheDocument();
  });

  it.each([
    ["/admin/crm/contacts", "Contacts"],
    ["/admin/crm/customers", "Customers"],
    ["/admin/crm/partners", "Partners"],
    ["/admin/crm/audit", "Audit log"],
    ["/admin/crm/roles", "Roles & settings"],
    ["/admin/crm/reports", "Reports"],
    ["/admin/crm/billing", "Billing"],
    ["/admin/crm/tasks", "Tasks"],
    ["/admin/crm/support", "Support"],
  ])("shows the real heading of the CRM page at %s", (pathname, heading) => {
    routerState.pathname = pathname;

    render(<RoutePendingSkeleton />);

    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
  });

  it("shows the real table headers of the contacts list while it loads", () => {
    routerState.pathname = "/admin/crm/contacts";

    render(<RoutePendingSkeleton />);

    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("shows the back link and the recent orders section for a customer detail page", () => {
    routerState.pathname = "/admin/crm/customers/user-1";

    render(<RoutePendingSkeleton />);

    expect(screen.getByText("← Back to customers")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent orders" })).toBeInTheDocument();
  });

  it("shows the back link and the per product section for a partner detail page", () => {
    routerState.pathname = "/admin/crm/partners/creator-1";

    render(<RoutePendingSkeleton />);

    expect(screen.getByText("← Back to partners")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Per product" })).toBeInTheDocument();
  });

  it("keeps the generic dashboard skeleton for the CRM home page", () => {
    routerState.pathname = "/admin/crm";

    const { container } = render(<RoutePendingSkeleton />);

    expect(container.querySelector(String.raw`.xl\:grid-cols-6`)).not.toBeNull();
  });

  it("shows the real heading and sections of the platform overview while it loads", () => {
    routerState.pathname = "/admin/platform";

    render(<RoutePendingSkeleton />);

    expect(screen.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Quick access" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Settlement reconciliation" })).toBeInTheDocument();
  });

  it("shows the back link and the real card titles of an order while it loads", () => {
    routerState.pathname = "/admin/orders/9c1d";

    render(<RoutePendingSkeleton />);

    expect(screen.getByText("Orders")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Buyer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Totals" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Items" })).toBeInTheDocument();
  });

  it("shows the back link of a tenant's metrics while it loads", () => {
    routerState.pathname = "/admin/platform/metrics/org-1";

    render(<RoutePendingSkeleton />);

    expect(screen.getByText("← All tenants")).toBeInTheDocument();
    expect(screen.getByText("Activity trend")).toBeInTheDocument();
  });

  it("shows the Details and Design tabs of the badge form while it loads", () => {
    routerState.pathname = "/admin/gamification/badges/new";

    render(<RoutePendingSkeleton />);

    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
  });

  it("shows a status skeleton for a support ticket while it loads", () => {
    routerState.pathname = "/admin/support/ticket-1";

    render(<RoutePendingSkeleton />);

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("falls back to the generic skeleton for an unknown page", () => {
    routerState.pathname = "/admin/team";

    render(<RoutePendingSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading page");
  });
});
