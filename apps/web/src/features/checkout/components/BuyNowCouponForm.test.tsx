import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkoutApi } from "../api/checkoutApi";
import { BuyNowCouponForm } from "./BuyNowCouponForm";

vi.mock("../api/checkoutApi", () => ({
  checkoutApi: { previewBuyNowCoupon: vi.fn() },
}));

const LINE = { productId: "product-1", sizeId: "size-1", qty: 1 };

const renderForm = (props: Partial<React.ComponentProps<typeof BuyNowCouponForm>> = {}) => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(
    <BuyNowCouponForm
      line={LINE}
      appliedCoupon={null}
      onApplied={vi.fn()}
      onRemoved={vi.fn()}
      {...props}
    />,
    { wrapper },
  );
};

beforeEach(() => {
  vi.mocked(checkoutApi.previewBuyNowCoupon).mockReset();
});

describe("BuyNowCouponForm", () => {
  it("previews and applies a coupon code", async () => {
    const onApplied = vi.fn();
    vi.mocked(checkoutApi.previewBuyNowCoupon).mockResolvedValue({
      code: "WELCOME300",
      discountAmount: 300,
      prepaidOnly: false,
    });

    renderForm({ onApplied });
    await userEvent.type(screen.getByLabelText("Coupon code"), "welcome300");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));

    await vi.waitFor(() =>
      expect(checkoutApi.previewBuyNowCoupon).toHaveBeenCalledWith("welcome300", LINE),
    );
    await vi.waitFor(() =>
      expect(onApplied).toHaveBeenCalledWith({
        code: "WELCOME300",
        discountAmount: 300,
        prepaidOnly: false,
      }),
    );
  });

  it("shows the server's refusal message on an invalid code", async () => {
    vi.mocked(checkoutApi.previewBuyNowCoupon).mockRejectedValue(new Error("Coupon not found"));

    renderForm();
    await userEvent.type(screen.getByLabelText("Coupon code"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("shows the applied coupon with a way to remove it instead of the input", async () => {
    const onRemoved = vi.fn();
    renderForm({
      appliedCoupon: { code: "WELCOME300", discountAmount: 300, prepaidOnly: false },
      onRemoved,
    });

    expect(screen.getByText("WELCOME300 applied")).toBeInTheDocument();
    expect(screen.queryByLabelText("Coupon code")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remove coupon" }));
    expect(onRemoved).toHaveBeenCalled();
  });
});
