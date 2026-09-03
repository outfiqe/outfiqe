import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { mswServer } from "@test/integration/msw/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ProductTypesPage } from "./ProductTypesPage";

const API_BASE = "http://localhost:3000/api";

const productType = (id: string, label: string, sortOrder: number, isActive = true) => ({
  id,
  slug: label.toLowerCase(),
  label,
  sortOrder,
  isActive,
  productCount: 0,
  sizeOptionCount: 1,
});

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: ProductTypesPage });
  const children = ["/product-types", "/size-options"].map((path) =>
    createRoute({ getParentRoute: () => rootRoute, path }),
  );
  const router = createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: ["/product-types"] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe("ProductTypesPage", () => {
  it("posts the dragged id order when one row is dropped onto another", async () => {
    let reorderBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/product-types/admin`, () =>
        okJson([
          productType("id-a", "Alpha", 0),
          productType("id-b", "Beta", 1),
          productType("id-c", "Gamma", 2),
        ]),
      ),
      http.post(`${API_BASE}/product-types/reorder`, async ({ request }) => {
        reorderBody = await request.json();
        return okJson(null);
      }),
    );

    renderPage();

    const cardFor = async (name: string) =>
      (await screen.findByRole("heading", { name })).closest('[draggable="true"]') as HTMLElement;

    fireEvent.dragStart(await cardFor("Gamma"));
    fireEvent.dragEnter(await cardFor("Alpha"));
    fireEvent.drop(await cardFor("Alpha"));

    await waitFor(() => expect(reorderBody).toEqual({ orderedIds: ["id-c", "id-a", "id-b"] }));
  });

  it("switches a garment type off", async () => {
    let patchBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/product-types/admin`, () => okJson([productType("id-a", "Alpha", 0)])),
      http.patch(`${API_BASE}/product-types/id-a`, async ({ request }) => {
        patchBody = await request.json();
        return okJson({ ...productType("id-a", "Alpha", 0, false) });
      }),
    );

    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Switch off" }));

    await waitFor(() => expect(patchBody).toEqual({ isActive: false }));
  });

  it("links to the sizes page for a type that has none yet", async () => {
    mswServer.use(
      http.get(`${API_BASE}/product-types/admin`, () =>
        okJson([{ ...productType("id-a", "Alpha", 0), sizeOptionCount: 0 }]),
      ),
    );

    renderPage();

    expect(await screen.findByRole("link", { name: "Add sizes" })).toHaveAttribute(
      "href",
      "/size-options",
    );
  });
});
