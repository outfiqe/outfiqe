import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ProductsPage } from "./ProductsPage";

const API_BASE = "http://localhost:3000/api";

const product = (id: string, name: string) => ({
  id,
  name,
  price: 1_000,
  productType: { slug: "jacket", label: "Jacket" },
  categories: [],
  imageUrl: null,
  lowStock: false,
  status: "PENDING" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  brand: { name: "Studio Nine" },
});

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const renderPage = () =>
  renderWithRouter(
    <>
      <ProductsPage />
      <Toaster />
    </>,
    { path: "/products" },
  );

describe("ProductsPage", () => {
  it("approves a pending product", async () => {
    let approveCalled = false;
    mswServer.use(
      http.get(`${API_BASE}/products/review`, () =>
        okJson({ products: [product("product-1", "Everyday Tee")], nextCursor: null }),
      ),
      http.post(`${API_BASE}/products/product-1/approve`, () => {
        approveCalled = true;
        return okJson(null);
      }),
    );

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Approve" }));

    expect(approveCalled).toBe(true);
  });

  it("shows an error toast when approving a product fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/products/review`, () =>
        okJson({ products: [product("product-1", "Everyday Tee")], nextCursor: null }),
      ),
      http.post(`${API_BASE}/products/product-1/approve`, () =>
        HttpResponse.json(
          { success: false, message: "Only platform staff can approve products." },
          { status: 403 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Approve" }));

    expect(
      await screen.findByText("Only platform staff can approve products."),
    ).toBeInTheDocument();
  });

  it("shows an error toast when rejecting a product fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/products/review`, () =>
        okJson({ products: [product("product-1", "Everyday Tee")], nextCursor: null }),
      ),
      http.post(`${API_BASE}/products/product-1/reject`, () =>
        HttpResponse.json(
          { success: false, message: "Only platform staff can reject products." },
          { status: 403 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Reject" }));

    expect(await screen.findByText("Only platform staff can reject products.")).toBeInTheDocument();
  });

  it("shows an empty state when there are no products in the tab", async () => {
    mswServer.use(
      http.get(`${API_BASE}/products/review`, () => okJson({ products: [], nextCursor: null })),
    );

    renderPage();

    expect(await screen.findByText("Nothing here right now.")).toBeInTheDocument();
  });

  it("reads the status filter from the URL on load", async () => {
    const requestedStatuses: (string | null)[] = [];
    mswServer.use(
      http.get(`${API_BASE}/products/review`, ({ request }) => {
        requestedStatuses.push(new URL(request.url).searchParams.get("status"));
        return okJson({ products: [], nextCursor: null });
      }),
    );

    renderWithRouter(
      <>
        <ProductsPage />
        <Toaster />
      </>,
      { path: "/products", initialEntry: "/products?status=APPROVED" },
    );

    await waitFor(() => expect(requestedStatuses).toContain("APPROVED"));
  });

  it("puts the chosen status in the URL and refetches", async () => {
    const requestedStatuses: (string | null)[] = [];
    mswServer.use(
      http.get(`${API_BASE}/products/review`, ({ request }) => {
        requestedStatuses.push(new URL(request.url).searchParams.get("status"));
        return okJson({ products: [], nextCursor: null });
      }),
    );

    const { router } = renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Rejected" }));

    await waitFor(() => expect(router.state.location.search).toEqual({ status: "REJECTED" }));
    await waitFor(() => expect(requestedStatuses).toContain("REJECTED"));
  });
});
