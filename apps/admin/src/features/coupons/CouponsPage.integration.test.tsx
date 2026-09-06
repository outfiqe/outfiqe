import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { CouponsPage } from "@/features/coupons/CouponsPage";

const API_BASE = "http://localhost:3000/api";

const buildCoupon = (overrides: Record<string, unknown> = {}) => ({
  id: "coupon-1",
  code: "WELCOME300",
  type: "FIXED",
  percentBasisPoints: null,
  fixedAmount: 300,
  maxDiscountAmount: null,
  minSubtotal: 0,
  startsAt: "2026-01-01T00:00:00.000Z",
  endsAt: null,
  status: "ACTIVE",
  totalBudgetAmount: 1_000,
  spentAmount: 400,
  budgetUtilizationPercent: 40,
  maxRedemptions: null,
  redemptionCount: 2,
  firstOrderOnly: false,
  prepaidOnly: false,
  stacksWithBrandDiscount: true,
  requiresApproval: false,
  approvedById: null,
  approvedAt: null,
  lastAlertedBudgetThreshold: null,
  createdById: "admin-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  eligibility: [],
  ...overrides,
});

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<CouponsPage />, { wrapper });
};

describe("CouponsPage", () => {
  it("shows a coupon's budget utilization and a pending-approval badge", async () => {
    mswServer.use(
      http.get(`${API_BASE}/admin/coupons`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: {
            coupons: [buildCoupon({ requiresApproval: true, approvedById: null })],
            nextCursor: null,
          },
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText("WELCOME300")).toBeInTheDocument();
    expect(screen.getByText("Pending approval")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("approves a pending coupon", async () => {
    let approvedById: string | null = null;
    mswServer.use(
      http.get(`${API_BASE}/admin/coupons`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: {
            coupons: [buildCoupon({ requiresApproval: true, approvedById })],
            nextCursor: null,
          },
        }),
      ),
      http.patch(`${API_BASE}/admin/coupons/coupon-1/approve`, () => {
        approvedById = "admin-2";
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: buildCoupon({ requiresApproval: true, approvedById }),
        });
      }),
    );

    renderPage();

    const approveButton = await screen.findByRole("button", { name: "Approve" });
    await userEvent.click(approveButton);

    await waitFor(() => expect(screen.queryByText("Pending approval")).not.toBeInTheDocument());
  });

  it("switches tabs to request a different status", async () => {
    mswServer.use(
      http.get(`${API_BASE}/admin/coupons`, ({ request }) => {
        const status = new URL(request.url).searchParams.get("status");
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: {
            coupons:
              status === "PAUSED"
                ? [buildCoupon({ id: "coupon-2", code: "PAUSEDCODE", status: "PAUSED" })]
                : [buildCoupon()],
            nextCursor: null,
          },
        });
      }),
    );

    renderPage();
    await screen.findByText("WELCOME300");

    await userEvent.click(screen.getByRole("button", { name: "PAUSED" }));

    expect(await screen.findByText("PAUSEDCODE")).toBeInTheDocument();
  });

  it("creates a new coupon", async () => {
    mswServer.use(
      http.get(`${API_BASE}/admin/coupons`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { coupons: [], nextCursor: null },
        }),
      ),
      http.post(`${API_BASE}/admin/coupons`, async ({ request }) => {
        const body = (await request.json()) as { code: string; fixedAmount: number };
        expect(body.code).toBe("NEWCODE1");
        expect(body.fixedAmount).toBe(150);
        return HttpResponse.json(
          { success: true, message: "ok", data: buildCoupon({ code: "NEWCODE1" }) },
          { status: 201 },
        );
      }),
    );

    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "New coupon" }));

    await userEvent.type(screen.getByLabelText("Code"), "NEWCODE1");
    await userEvent.selectOptions(screen.getByLabelText("Discount type"), "FIXED");
    await userEvent.clear(screen.getByLabelText("Amount off (Rs.)"));
    await userEvent.type(screen.getByLabelText("Amount off (Rs.)"), "150");

    await userEvent.click(screen.getByRole("button", { name: "Create coupon" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /new coupon/i })).not.toBeInTheDocument(),
    );
  });

  it("looks up a redemption by coupon code", async () => {
    mswServer.use(
      http.get(`${API_BASE}/admin/coupons`, () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { coupons: [], nextCursor: null },
        }),
      ),
      http.get(`${API_BASE}/admin/coupons/redemptions`, ({ request }) => {
        expect(new URL(request.url).searchParams.get("code")).toBe("WELCOME300");
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: {
            redemptions: [
              {
                id: "redemption-1",
                couponId: "coupon-1",
                couponCode: "WELCOME300",
                userId: "user-1",
                userEmail: "buyer@outfiqe.test",
                orderId: "order-1",
                discountAmount: 300,
                platformFundedAmount: 300,
                brandFundedAmount: 0,
                status: "CONSUMED",
                releasedAt: null,
                releasedReason: null,
                flaggedForReview: false,
                flagReason: null,
                createdAt: "2026-01-01T00:00:00.000Z",
              },
            ],
            nextCursor: null,
          },
        });
      }),
    );

    renderPage();
    await userEvent.click(await screen.findByRole("tab", { name: "Redemption lookup" }));
    await userEvent.type(screen.getByLabelText("Coupon code"), "WELCOME300");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("buyer@outfiqe.test", { exact: false })).toBeInTheDocument();
  });
});
