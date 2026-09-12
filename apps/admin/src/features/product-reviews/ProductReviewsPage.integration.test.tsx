import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { ProductReviewsPage } from "./ProductReviewsPage";

const API_BASE = "http://localhost:3000/api";

const PRODUCT = { id: "product-1", name: "Everyday Tee", brand: "Studio Nine", imageUrl: null };

const REVIEW = {
  id: "review-1",
  productId: "product-1",
  rating: 4,
  title: "Great fit",
  body: "Runs true to size.",
  helpfulCount: 2,
  createdAt: "2026-01-01T00:00:00.000Z",
  author: { id: "user-1", name: "Ava Martinez", handle: "ava", avatarUrl: null },
  images: [],
};

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
};

const selectProduct = async (user: ReturnType<typeof userEvent.setup>) => {
  mswServer.use(
    http.get(`${API_BASE}/products/autocomplete`, () =>
      HttpResponse.json({ success: true, data: [PRODUCT] }),
    ),
    http.get(`${API_BASE}/products/product-1/reviews`, () =>
      HttpResponse.json({ success: true, data: { reviews: [REVIEW], nextCursor: null } }),
    ),
  );

  render(<ProductReviewsPage />, { wrapper });
  await user.type(screen.getByPlaceholderText("Search products by name…"), "Everyday");
  await user.click(await screen.findByText("Everyday Tee"));
  await screen.findByText("Runs true to size.");
};

describe("ProductReviewsPage", () => {
  it("does not delete a review until the confirmation dialog is accepted", async () => {
    let deleteCalled = false;
    mswServer.use(
      http.delete(`${API_BASE}/products/product-1/reviews/review-1`, () => {
        deleteCalled = true;
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    const user = userEvent.setup();
    await selectProduct(user);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Delete Ava Martinez's review/)).toBeInTheDocument();
    expect(deleteCalled).toBe(false);

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteCalled).toBe(false);
    expect(screen.getByText("Runs true to size.")).toBeInTheDocument();
  });

  it("deletes the review once the confirmation dialog is accepted", async () => {
    let deleteCalled = false;
    mswServer.use(
      http.delete(`${API_BASE}/products/product-1/reviews/review-1`, () => {
        deleteCalled = true;
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    const user = userEvent.setup();
    await selectProduct(user);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteCalled).toBe(true));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows an error toast and keeps the review when deletion fails", async () => {
    mswServer.use(
      http.delete(`${API_BASE}/products/product-1/reviews/review-1`, () =>
        HttpResponse.json(
          { success: false, message: "Only platform staff can remove reviews." },
          { status: 403 },
        ),
      ),
    );

    const user = userEvent.setup();
    await selectProduct(user);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Only platform staff can remove reviews.")).toBeInTheDocument();
    expect(screen.getByText("Runs true to size.")).toBeInTheDocument();
  });
});
