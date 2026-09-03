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

  it("shows an empty state when there are no garment types", async () => {
    mswServer.use(http.get(`${API_BASE}/product-types/admin`, () => okJson([])));

    renderPage();

    expect(await screen.findByText("No garment types yet.")).toBeInTheDocument();
  });

  it("creates a garment type from the form, auto-filling the slug, then clears it", async () => {
    let createBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/product-types/admin`, () => okJson([])),
      http.post(`${API_BASE}/product-types`, async ({ request }) => {
        createBody = await request.json();
        return okJson(productType("id-new", "Party Wear", 0));
      }),
    );

    renderPage();
    const user = userEvent.setup();

    const nameField = await screen.findByLabelText("Name");
    await user.type(nameField, "Party Wear");
    expect(await screen.findByLabelText("Slug")).toHaveValue("party-wear");

    await user.click(screen.getByRole("button", { name: "Create type" }));

    await waitFor(() => expect(createBody).toEqual({ label: "Party Wear", slug: "party-wear" }));
    await waitFor(() => expect(nameField).toHaveValue(""));
  });

  it("keeps a hand-edited slug when the name changes afterwards", async () => {
    mswServer.use(http.get(`${API_BASE}/product-types/admin`, () => okJson([])));

    renderPage();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Slug"), "customslug");
    await user.type(screen.getByLabelText("Name"), "Totally Different");

    expect(screen.getByLabelText("Slug")).toHaveValue("customslug");
  });

  it("surfaces a server error when the create fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/product-types/admin`, () => okJson([])),
      http.post(`${API_BASE}/product-types`, () =>
        HttpResponse.json(
          { success: false, message: "That slug is already taken." },
          { status: 409 },
        ),
      ),
    );

    renderPage();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Name"), "Shoes");
    await user.click(screen.getByRole("button", { name: "Create type" }));

    expect(await screen.findByText("That slug is already taken.")).toBeInTheDocument();
  });

  it("reorders with the arrow buttons", async () => {
    let reorderBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/product-types/admin`, () =>
        okJson([productType("id-a", "Alpha", 0), productType("id-b", "Beta", 1)]),
      ),
      http.post(`${API_BASE}/product-types/reorder`, async ({ request }) => {
        reorderBody = await request.json();
        return okJson(null);
      }),
    );

    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Move Beta up" }));

    await waitFor(() => expect(reorderBody).toEqual({ orderedIds: ["id-b", "id-a"] }));
  });

  it("rolls the list back to its original order when a reorder request fails", async () => {
    const rows = [productType("id-a", "Alpha", 0), productType("id-b", "Beta", 1)];
    mswServer.use(
      http.get(`${API_BASE}/product-types/admin`, () => okJson(rows)),
      http.post(`${API_BASE}/product-types/reorder`, () =>
        HttpResponse.json({ success: false, message: "nope" }, { status: 500 }),
      ),
    );

    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Move Alpha down" }));

    await waitFor(() => {
      const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
      expect(headings).toEqual(["Alpha", "Beta"]);
    });
  });

  it("shows a loading line before the list arrives", async () => {
    mswServer.use(
      http.get(`${API_BASE}/product-types/admin`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 40));
        return okJson([]);
      }),
    );

    renderPage();

    expect(await screen.findByText("Loading…")).toBeInTheDocument();
  });
});
