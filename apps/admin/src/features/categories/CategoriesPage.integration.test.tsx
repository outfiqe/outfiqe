import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { grantOnlyPlatformPermissions } from "@test/platformPermissionsMock";
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
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
  return render(<CategoriesPage />, { wrapper });
};

const stubPopularity = (rows: { slug: string; userCount: number }[] = []) =>
  mswServer.use(http.get(`${API_BASE}/taste-preferences/popularity`, () => okJson(rows)));

const stubEmptyList = () => {
  mswServer.use(http.get(`${API_BASE}/categories/admin`, () => okJson([])));
  stubPopularity();
};

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

  it("shows an error toast when publishing a category fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/categories/admin`, () => okJson([category("id-a", "Alpha", 0)])),
      http.patch(`${API_BASE}/categories/id-a`, () =>
        HttpResponse.json(
          { success: false, message: "Only platform staff can publish categories." },
          { status: 403 },
        ),
      ),
    );
    stubPopularity();

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Unpublish" }));

    expect(
      await screen.findByText("Only platform staff can publish categories."),
    ).toBeInTheDocument();
  });

  it("shows inline messages instead of a browser popup when the form is submitted empty", async () => {
    stubEmptyList();
    const createRequested = vi.fn();
    mswServer.use(
      http.post(`${API_BASE}/categories`, () => {
        createRequested();
        return okJson(category("new", "New", 0));
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Create category" }));

    expect(await screen.findByText("Enter a name for the category.")).toBeInTheDocument();
    expect(screen.getByText("Enter a slug for the category.")).toBeInTheDocument();
    expect(createRequested).not.toHaveBeenCalled();
  });

  it("explains a slug with capitals or spaces and does not send it", async () => {
    stubEmptyList();
    const createRequested = vi.fn();
    mswServer.use(
      http.post(`${API_BASE}/categories`, () => {
        createRequested();
        return okJson(category("new", "New", 0));
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText("Name"), "Old Money");
    const slugField = screen.getByLabelText("Slug");
    await user.clear(slugField);
    await user.type(slugField, "x");
    await user.click(screen.getByRole("button", { name: "Create category" }));

    expect(await screen.findByText("Use at least 2 characters.")).toBeInTheDocument();
    expect(createRequested).not.toHaveBeenCalled();
  });

  it("fills the slug from the name, creates the category and shows a success toast", async () => {
    stubEmptyList();
    let createBody: unknown;
    mswServer.use(
      http.post(`${API_BASE}/categories`, async ({ request }) => {
        createBody = await request.json();
        return okJson(category("new", "Old Money", 0));
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText("Name"), "Old Money");
    expect(screen.getByLabelText("Slug")).toHaveValue("old-money");
    await user.click(screen.getByRole("button", { name: "Create category" }));

    await waitFor(() => expect(createBody).toEqual({ name: "Old Money", slug: "old-money" }));
    expect(await screen.findByText("Category created.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue(""));
  });

  it("keeps what was typed and shows the server's reason when creating fails", async () => {
    stubEmptyList();
    mswServer.use(
      http.post(`${API_BASE}/categories`, () =>
        HttpResponse.json(
          { success: false, message: "This slug is already in use." },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText("Name"), "Old Money");
    await user.click(screen.getByRole("button", { name: "Create category" }));

    expect(await screen.findByText("This slug is already in use.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Old Money");
  });

  it("shows a success toast when a category is published or unpublished", async () => {
    mswServer.use(
      http.get(`${API_BASE}/categories/admin`, () => okJson([category("id-a", "Alpha", 0)])),
      http.patch(`${API_BASE}/categories/id-a`, () =>
        okJson({ ...category("id-a", "Alpha", 0), status: "DRAFT" }),
      ),
    );
    stubPopularity();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Unpublish" }));

    expect(await screen.findByText("Category unpublished.")).toBeInTheDocument();
  });

  it("shows a view-only catalog role the list without any way to change it", async () => {
    grantOnlyPlatformPermissions("platform:catalog:read");
    mswServer.use(
      http.get(`${API_BASE}/categories/admin`, () =>
        okJson([category("id-a", "Alpha", 0), category("id-b", "Beta", 1)]),
      ),
    );
    stubPopularity();

    renderPage();

    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create category" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unpublish" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move Alpha down" })).not.toBeInTheDocument();
  });
});
