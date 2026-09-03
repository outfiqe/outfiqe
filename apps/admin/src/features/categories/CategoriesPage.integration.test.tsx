import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { CategoriesPage } from "./CategoriesPage";

vi.mock("@/components/ImageUpload", () => ({
  ImageUpload: () => null,
}));

const API_BASE = "http://localhost:3000/api";

const category = (id: string, name: string, sortOrder: number) => ({
  id,
  slug: name.toLowerCase(),
  name,
  imageUrl: null,
  status: "PUBLISHED" as const,
  sortOrder,
  productCount: 0,
});

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<CategoriesPage />, { wrapper });
};

const stubPopularity = (rows: { slug: string; userCount: number }[] = []) =>
  mswServer.use(http.get(`${API_BASE}/taste-preferences/popularity`, () => okJson(rows)));

describe("CategoriesPage", () => {
  it("posts the swapped id order when a category is moved down", async () => {
    let reorderBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/categories/admin`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: [
            category("id-a", "Alpha", 0),
            category("id-b", "Beta", 1),
            category("id-c", "Gamma", 2),
          ],
        }),
      ),
      http.post(`${API_BASE}/categories/reorder`, async ({ request }) => {
        reorderBody = await request.json();
        return HttpResponse.json({ success: true, message: "Categories reordered.", data: null });
      }),
    );
    stubPopularity();

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Move Alpha down" }));

    await waitFor(() => expect(reorderBody).toEqual({ orderedIds: ["id-b", "id-a", "id-c"] }));
  });

  it("posts the dragged id order when a category is dropped onto another", async () => {
    let reorderBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/categories/admin`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: [
            category("id-a", "Alpha", 0),
            category("id-b", "Beta", 1),
            category("id-c", "Gamma", 2),
          ],
        }),
      ),
      http.post(`${API_BASE}/categories/reorder`, async ({ request }) => {
        reorderBody = await request.json();
        return HttpResponse.json({ success: true, message: "ok", data: null });
      }),
    );
    stubPopularity();

    renderPage();

    const cardFor = async (name: string) =>
      (await screen.findByRole("heading", { name })).closest('[draggable="true"]') as HTMLElement;

    fireEvent.dragStart(await cardFor("Gamma"));
    fireEvent.dragEnter(await cardFor("Alpha"));
    fireEvent.drop(await cardFor("Alpha"));

    await waitFor(() => expect(reorderBody).toEqual({ orderedIds: ["id-c", "id-a", "id-b"] }));
  });

  it("shows how many shoppers have pinned each category", async () => {
    mswServer.use(
      http.get(`${API_BASE}/categories/admin`, () => okJson([category("id-a", "Alpha", 0)])),
    );
    stubPopularity([{ slug: "alpha", userCount: 4 }]);

    renderPage();

    expect(await screen.findByText(/4 shoppers pinned this/)).toBeInTheDocument();
  });

  it("disables the up arrow on the first category and the down arrow on the last", async () => {
    mswServer.use(
      http.get(`${API_BASE}/categories/admin`, () =>
        okJson([category("id-a", "Alpha", 0), category("id-b", "Beta", 1)]),
      ),
    );
    stubPopularity();

    renderPage();

    expect(await screen.findByRole("button", { name: "Move Alpha up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Beta down" })).toBeDisabled();
  });
});
