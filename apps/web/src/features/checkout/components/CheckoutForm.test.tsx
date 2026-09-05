import { toast } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import type { Cart } from "@/features/cart";

import { CheckoutForm } from "./CheckoutForm";

let isOnline = true;
const checkoutMutateAsync = vi.fn();
const initiatePaymentMutateAsync = vi.fn();

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({ state: { user: { name: "Ram Shrestha" } } }),
}));

vi.mock("@/features/delivery-zones", () => ({
  CityAutocomplete: ({ value, onChange }: { value: string; onChange: (city: string) => void }) => (
    <input aria-label="City" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

vi.mock("@/features/payments", () => ({
  redirectToPaymentGateway: vi.fn(),
  useInitiatePayment: () => ({
    mutateAsync: initiatePaymentMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/features/pwa", () => ({
  useIsOnline: () => isOnline,
}));

vi.mock("../hooks/useCheckout", () => ({
  useCheckout: () => ({ mutateAsync: checkoutMutateAsync, isPending: false }),
}));

const aCart = (): Cart =>
  ({
    subtotal: 1000,
    deliveryFee: 100,
    city: "",
  }) as Cart;

const renderCheckoutForm = () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<CheckoutForm cart={aCart()} codHandlingFee={50} />, { wrapper });
};

const fillRequiredFields = async () => {
  await userEvent.type(screen.getByLabelText(/full name/i), "Ram Shrestha");
  await userEvent.type(screen.getByLabelText(/^phone$/i), "9800000000");
  await userEvent.type(screen.getByLabelText(/address/i), "Baneshwor, Kathmandu");
  await userEvent.type(screen.getByLabelText("City"), "Kathmandu");
};

beforeEach(() => {
  isOnline = true;
  checkoutMutateAsync.mockReset();
  initiatePaymentMutateAsync.mockReset();
  vi.spyOn(toast, "error").mockImplementation(() => "");
});

describe("CheckoutForm", () => {
  it("submits the order when there is a connection", async () => {
    checkoutMutateAsync.mockResolvedValue({ id: "order-1", paymentMethod: "COD" });
    renderCheckoutForm();
    await fillRequiredFields();

    fireEvent.submit(screen.getByRole("button", { name: /place order/i }).closest("form")!);

    await vi.waitFor(() => expect(checkoutMutateAsync).toHaveBeenCalledTimes(1));
  });

  it("refuses to submit an order while offline, without ever calling checkout", async () => {
    isOnline = false;
    renderCheckoutForm();
    await fillRequiredFields();

    fireEvent.submit(screen.getByRole("button", { name: /you're offline/i }).closest("form")!);

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Checkout needs a connection. Try again once you're back online.",
      ),
    );
    expect(checkoutMutateAsync).not.toHaveBeenCalled();
  });
});
