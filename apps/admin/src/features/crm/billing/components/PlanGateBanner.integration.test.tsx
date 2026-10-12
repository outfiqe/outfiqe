import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PlanGateBanner } from "./PlanGateBanner";

const renderWithRouter = (advancedFeaturesEnabled: boolean) => {
  const rootRoute = createRootRoute({
    component: () => <PlanGateBanner advancedFeaturesEnabled={advancedFeaturesEnabled} />,
  });
  const billingRoute = createRoute({ getParentRoute: () => rootRoute, path: "/crm/billing" });
  const router = createRouter({
    routeTree: rootRoute.addChildren([billingRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
};

describe("PlanGateBanner", () => {
  it("prompts the viewer to subscribe when advanced features are gated", async () => {
    renderWithRouter(false);

    expect(await screen.findByText(/trial has ended/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to billing" })).toBeInTheDocument();
  });

  it("renders nothing when advanced features are still available", () => {
    renderWithRouter(true);

    expect(screen.queryByText(/trial has ended/i)).not.toBeInTheDocument();
  });
});
