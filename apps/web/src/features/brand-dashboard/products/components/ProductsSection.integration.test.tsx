import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, type JsonBodyType } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import { ProductsSection } from "./ProductsSection";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));

vi.mock("./ProductModal", () => ({ ProductModal: () => null }));
vi.mock("./EditProductModal", () => ({ EditProductModal: () => null }));
vi.mock("./StockModal", () => ({ StockModal: () => null }));
vi.mock("./DiscountModal", () => ({ DiscountModal: () => null }));

const stubList = (status: number, body: JsonBodyType) => {
  mswServer.use(http.get("/api/products/mine", () => HttpResponse.json(body, { status })));
};

const renderSection = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<ProductsSection />, { wrapper });
};

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
});

describe("ProductsSection", () => {
  it("shows a retry-capable error instead of a silent empty grid when the fetch fails", async () => {
    stubList(500, { success: false, message: "Server exploded", code: "INTERNAL_ERROR" });
    renderSection();

    expect(await screen.findByText(/couldn.t load your products/i)).toBeInTheDocument();
    expect(
      screen.queryByText("Nothing listed yet — add your first piece."),
    ).not.toBeInTheDocument();

    stubList(200, { success: true, message: "ok", data: { products: [], nextCursor: null } });
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByText("Nothing listed yet — add your first piece."),
    ).toBeInTheDocument();
  });

  it("shows the empty state when the fetch succeeds with zero products", async () => {
    stubList(200, { success: true, message: "ok", data: { products: [], nextCursor: null } });
    renderSection();

    expect(
      await screen.findByText("Nothing listed yet — add your first piece."),
    ).toBeInTheDocument();
  });
});
