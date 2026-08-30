import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { CrmSearchBox } from "./CrmSearchBox";

const API_BASE = "http://localhost:3000/api";

const EMPTY_RESULTS = { partners: [], customers: [], deals: [], tickets: [] };

const renderSearchBox = (
  props: { viewerIsSuperAdmin: boolean; viewerPermissionKeys: string[] } = {
    viewerIsSuperAdmin: true,
    viewerPermissionKeys: [],
  },
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: () => <CrmSearchBox {...props} /> });
  const children = [
    "/crm",
    "/crm/partners/$creatorId",
    "/crm/customers/$userId",
    "/crm/pipeline",
    "/crm/support",
  ].map((path) => createRoute({ getParentRoute: () => rootRoute, path }));
  const router = createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: ["/crm"] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe("CrmSearchBox", () => {
  it("renders nothing for a viewer with no CRM read permissions", () => {
    renderSearchBox({ viewerIsSuperAdmin: false, viewerPermissionKeys: ["billing:read"] });
    expect(screen.queryByLabelText("Search the CRM")).not.toBeInTheDocument();
  });

  it("groups matches by entity type and clears the box after a selection", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/search`, () =>
        HttpResponse.json({
          success: true,
          data: {
            partners: [{ creatorId: "p1", name: "Spring Creator", handle: "springco" }],
            customers: [{ userId: "u1", name: "Spring Shopper", handle: "springshop" }],
            deals: [
              { id: "d1", title: "Spring collab", value: 4000, status: "OPEN", stageName: "Lead" },
            ],
            tickets: [{ id: "t1", title: "Spring order issue", type: "COMPLAINT", status: "OPEN" }],
          },
        }),
      ),
    );

    renderSearchBox();
    const user = userEvent.setup({ delay: null });

    const input = await screen.findByLabelText("Search the CRM");
    await user.type(input, "spring");

    expect(await screen.findByText("Spring collab")).toBeInTheDocument();
    expect(screen.getByText("Spring order issue")).toBeInTheDocument();
    expect(screen.getByText("Spring Creator")).toBeInTheDocument();
    expect(screen.getByText("Spring Shopper")).toBeInTheDocument();
    expect(screen.getByText("Partners")).toBeInTheDocument();
    expect(screen.getByText("Customers")).toBeInTheDocument();
    expect(screen.getByText("Deals")).toBeInTheDocument();
    expect(screen.getByText("Tickets")).toBeInTheDocument();

    await user.click(screen.getByText("Spring Creator"));
    await waitFor(() => expect(screen.getByLabelText("Search the CRM")).toHaveValue(""));
  }, 15000);

  it("shows an explicit empty state when nothing matches", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/search`, () =>
        HttpResponse.json({ success: true, data: EMPTY_RESULTS }),
      ),
    );

    renderSearchBox();
    const user = userEvent.setup({ delay: null });

    await user.type(await screen.findByLabelText("Search the CRM"), "zzz");

    expect(await screen.findByText(/No matches for/i)).toBeInTheDocument();
  });
});
