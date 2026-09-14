import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import { BankAccountsList } from "./BankAccountsList";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));

const renderList = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<BankAccountsList ownerType="BUSINESS" />, { wrapper });
};

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    state: { user: { role: "BRAND_OWNER" } },
  } as ReturnType<typeof useAuth>);
});

describe("BankAccountsList", () => {
  it("shows the empty state when the brand has no bank accounts yet", async () => {
    mswServer.use(
      http.get("/api/brand-bank-accounts", () =>
        HttpResponse.json({ success: true, message: "ok", data: [] }),
      ),
    );
    renderList();

    expect(
      await screen.findByText("No bank accounts yet — add one to request a withdrawal."),
    ).toBeInTheDocument();
  });

  it("lists an existing bank account", async () => {
    mswServer.use(
      http.get("/api/brand-bank-accounts", () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: [
            {
              id: "account-1",
              bankId: "bank-1",
              bankName: "Nepal Bank",
              accountName: "Brand Account",
              accountNumberLast4: "5678",
              branchName: "Kathmandu",
              isDefault: true,
              isVerified: true,
            },
          ],
        }),
      ),
    );
    renderList();

    expect(await screen.findByText(/Nepal Bank/)).toBeInTheDocument();
    expect(screen.getByText(/5678/)).toBeInTheDocument();
  });

  it("shows an error banner instead of the empty state when the list fails to load", async () => {
    mswServer.use(
      http.get("/api/brand-bank-accounts", () =>
        HttpResponse.json(
          { success: false, message: "Something went wrong.", code: "INTERNAL_ERROR" },
          { status: 500 },
        ),
      ),
    );
    renderList();

    expect(
      await screen.findByText("We couldn't load your bank accounts right now. Please try again."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No bank accounts yet — add one to request a withdrawal."),
    ).not.toBeInTheDocument();
  });
});
