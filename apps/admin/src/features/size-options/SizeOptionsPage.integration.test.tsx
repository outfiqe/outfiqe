import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { SizeOptionsPage } from "./SizeOptionsPage";

const API_BASE = "http://localhost:3000/api";

const PRODUCT_TYPE = {
  id: "type-1",
  slug: "tops",
  label: "Tops",
  sortOrder: 0,
  isActive: true,
  productCount: 4,
  sizeOptionCount: 1,
};

const SIZE_OPTION = { id: "size-1", type: "tops", label: "M", sortOrder: 0 };

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
};

const renderWithSizes = () => {
  mswServer.use(
    http.get(`${API_BASE}/product-types/admin`, () =>
      HttpResponse.json({ success: true, data: [PRODUCT_TYPE] }),
    ),
    http.get(`${API_BASE}/size-options/admin`, () =>
      HttpResponse.json({ success: true, data: [SIZE_OPTION] }),
    ),
  );

  render(<SizeOptionsPage />, { wrapper });
};

describe("SizeOptionsPage", () => {
  it("does not delete a size until the confirmation dialog is accepted", async () => {
    let deleteCalled = false;
    mswServer.use(
      http.delete(`${API_BASE}/size-options/size-1`, () => {
        deleteCalled = true;
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    const user = userEvent.setup();
    renderWithSizes();

    await user.click(await screen.findByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText('Delete the "M" size?')).toBeInTheDocument();
    expect(deleteCalled).toBe(false);

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteCalled).toBe(false);
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("deletes the size once the confirmation dialog is accepted", async () => {
    let deleteCalled = false;
    mswServer.use(
      http.delete(`${API_BASE}/size-options/size-1`, () => {
        deleteCalled = true;
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    const user = userEvent.setup();
    renderWithSizes();

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteCalled).toBe(true));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows an error toast and keeps the size when deletion fails", async () => {
    mswServer.use(
      http.delete(`${API_BASE}/size-options/size-1`, () =>
        HttpResponse.json(
          { success: false, message: "This size is still used by a product." },
          { status: 409 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderWithSizes();

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("This size is still used by a product.")).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
  });
});
