import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CrmTabs } from "./CrmTabs";

const renderTabs = (props: { viewerIsSuperAdmin: boolean; viewerPermissionKeys: string[] }) => {
  const rootRoute = createRootRoute({ component: () => <CrmTabs {...props} /> });
  const children = [
    "/crm",
    "/crm/partners",
    "/crm/customers",
    "/crm/pipeline",
    "/crm/tasks",
    "/crm/support",
    "/crm/billing",
  ].map((path) => createRoute({ getParentRoute: () => rootRoute, path }));
  const router = createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: ["/crm"] }),
  });
  render(<RouterProvider router={router} />);
};

describe("CrmTabs", () => {
  it("shows every tab the viewer's permissions allow", async () => {
    renderTabs({
      viewerIsSuperAdmin: false,
      viewerPermissionKeys: ["accounts:read", "billing:read"],
    });

    expect(await screen.findByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Partners" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Billing" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Customers" })).not.toBeInTheDocument();
  });

  it("shows all tabs to the SUPERADMIN", async () => {
    renderTabs({ viewerIsSuperAdmin: true, viewerPermissionKeys: [] });

    expect(await screen.findByRole("link", { name: "Customers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Partners" })).toBeInTheDocument();
  });
});
