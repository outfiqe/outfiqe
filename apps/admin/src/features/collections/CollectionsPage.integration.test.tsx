import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { CollectionsPage } from "./CollectionsPage";

vi.mock("@/components/ImageUpload", () => ({
  ImageUpload: () => null,
}));

const API_BASE = "http://localhost:3000/api";

const collection = (id: string, name: string, status: "DRAFT" | "PUBLISHED" = "PUBLISHED") => ({
  id,
  name,
  slug: name.toLowerCase().replace(/\s+/g, "-"),
  description: null,
  imageUrl: null,
  status,
  sortOrder: 0,
  productCount: 2,
});

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
};

const renderPage = () => render(<CollectionsPage />, { wrapper });

const stubList = (items: ReturnType<typeof collection>[] = []) =>
  mswServer.use(http.get(`${API_BASE}/collections/admin`, () => okJson(items)));

describe("CollectionsPage", () => {
  it("shows inline messages, not a browser popup, when the form is submitted empty", async () => {
    stubList();
    const createRequested = vi.fn();
    mswServer.use(
      http.post(`${API_BASE}/collections`, () => {
        createRequested();
        return okJson(collection("new", "New"));
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Create collection" }));

    expect(await screen.findByText("Enter a name for the collection.")).toBeInTheDocument();
    expect(screen.getByText("Enter a slug for the collection.")).toBeInTheDocument();
    expect(createRequested).not.toHaveBeenCalled();
  });

  it("explains a description that is too long and does not send it", async () => {
    stubList();
    const createRequested = vi.fn();
    mswServer.use(
      http.post(`${API_BASE}/collections`, () => {
        createRequested();
        return okJson(collection("new", "New"));
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText("Name"), "Dashain Edit");
    await user.click(screen.getByLabelText("Description"));
    await user.paste("a".repeat(281));
    await user.click(screen.getByRole("button", { name: "Create collection" }));

    expect(await screen.findByText("Use at most 280 characters.")).toBeInTheDocument();
    expect(createRequested).not.toHaveBeenCalled();
  });

  it("fills the slug from the name, creates the collection, clears the form and shows a toast", async () => {
    stubList();
    let createBody: unknown;
    mswServer.use(
      http.post(`${API_BASE}/collections`, async ({ request }) => {
        createBody = await request.json();
        return okJson(collection("new", "Dashain Edit"));
      }),
    );
    const user = userEvent.setup();
    renderPage();

    const nameField = await screen.findByLabelText("Name");
    await user.type(nameField, "Dashain Edit");
    expect(screen.getByLabelText("Slug")).toHaveValue("dashain-edit");
    await user.click(screen.getByRole("button", { name: "Create collection" }));

    await waitFor(() => expect(createBody).toEqual({ name: "Dashain Edit", slug: "dashain-edit" }));
    expect(await screen.findByText("Collection created.")).toBeInTheDocument();
    await waitFor(() => expect(nameField).toHaveValue(""));
  });

  it("keeps what was typed and shows the server's reason when creating fails", async () => {
    stubList();
    mswServer.use(
      http.post(`${API_BASE}/collections`, () =>
        HttpResponse.json(
          { success: false, message: "This slug is already in use." },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText("Name"), "Dashain Edit");
    await user.click(screen.getByRole("button", { name: "Create collection" }));

    expect(await screen.findByText("This slug is already in use.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Dashain Edit");
  });

  it("shows a success toast when a collection is unpublished", async () => {
    stubList([collection("col-a", "Alpha")]);
    mswServer.use(
      http.patch(`${API_BASE}/collections/col-a`, () =>
        okJson(collection("col-a", "Alpha", "DRAFT")),
      ),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Unpublish" }));

    expect(await screen.findByText("Collection unpublished.")).toBeInTheDocument();
  });

  it("shows an error toast when publishing fails", async () => {
    stubList([collection("col-a", "Alpha", "DRAFT")]);
    mswServer.use(
      http.patch(`${API_BASE}/collections/col-a`, () =>
        HttpResponse.json(
          { success: false, message: "Only platform staff can publish collections." },
          { status: 403 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Publish" }));

    expect(
      await screen.findByText("Only platform staff can publish collections."),
    ).toBeInTheDocument();
  });
});
