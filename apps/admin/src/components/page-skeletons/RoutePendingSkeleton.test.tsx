import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RoutePendingSkeleton } from "./RoutePendingSkeleton";

const routerState = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("@tanstack/react-router", () => ({
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

  it("shows the kanban skeleton for the pipeline", () => {
    routerState.pathname = "/admin/crm/pipeline";

    const { container } = render(<RoutePendingSkeleton />);

    expect(container.querySelector(String.raw`.xl\:grid-cols-4`)).not.toBeNull();
  });

  it("shows the dashboard skeleton for the platform overview", () => {
    routerState.pathname = "/admin/platform";

    const { container } = render(<RoutePendingSkeleton />);

    expect(container.querySelector(String.raw`.xl\:grid-cols-6`)).not.toBeNull();
  });

  it("shows the form skeleton for a detail page", () => {
    routerState.pathname = "/admin/orders/9c1d";

    const { container } = render(<RoutePendingSkeleton />);

    expect(container.querySelector(".max-w-3xl")).not.toBeNull();
  });

  it("falls back to the generic skeleton for an unknown page", () => {
    routerState.pathname = "/admin/team";

    render(<RoutePendingSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading page");
  });
});
