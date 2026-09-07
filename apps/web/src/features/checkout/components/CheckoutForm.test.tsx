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
import type * as DeliveryZonesModule from "@/features/delivery-zones";
import type { DeliveryZone } from "@/features/delivery-zones";

import { CheckoutForm } from "./CheckoutForm";

let isOnline = true;
const checkoutMutateAsync = vi.fn();
const initiatePaymentMutateAsync = vi.fn();
const createAddressMutateAsync = vi.fn();

type SavedAddress = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  landmark: string | null;
  isDefault: boolean;
};

let savedAddresses: SavedAddress[] = [];

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({ state: { user: { name: "Ram Shrestha" } } }),
}));

vi.mock("@/features/addresses", () => ({
  NEW_ADDRESS_OPTION: "new",
  useAddresses: () => ({ data: savedAddresses }),
  useCreateAddress: () => ({ mutateAsync: createAddressMutateAsync }),
  SavedAddressPicker: ({
    addresses,
    selectedId,
    onSelect,
  }: {
    addresses: SavedAddress[];
    selectedId: string;
    onSelect: (value: string) => void;
  }) => (
    <div>
      {addresses.map((address) => (
        <label key={address.id}>
          <input
            type="radio"
            name="saved-address"
            checked={selectedId === address.id}
            onChange={() => onSelect(address.id)}
          />
          {address.fullName}
        </label>
      ))}
      <label>
        <input
          type="radio"
          name="saved-address"
          checked={selectedId === "new"}
          onChange={() => onSelect("new")}
        />
        Use a new address
      </label>
    </div>
  ),
}));

vi.mock("@/features/delivery-zones", async () => {
  const actual = await vi.importActual<typeof DeliveryZonesModule>("@/features/delivery-zones");
  return {
    ...actual,
    CityAutocomplete: ({
      value,
      onChange,
    }: {
      value: string;
      onChange: (city: string) => void;
    }) => (
      <input aria-label="City" value={value} onChange={(event) => onChange(event.target.value)} />
    ),
  };
});

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
    city: "",
  }) as Cart;

const ZONES: DeliveryZone[] = [
  {
    id: "zone-default",
    name: "Default",
    isDefault: true,
    cities: [],
    standardDeliveryFee: 100,
    freeDeliveryThreshold: 100_000,
    codHandlingFee: 50,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "zone-pokhara",
    name: "Pokhara",
    isDefault: false,
    cities: ["Pokhara"],
    standardDeliveryFee: 250,
    freeDeliveryThreshold: 100_000,
    codHandlingFee: 80,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const renderCheckoutForm = (zones: DeliveryZone[] = ZONES) => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<CheckoutForm cart={aCart()} zones={zones} />, { wrapper });
};

const fillRequiredFields = async () => {
  await userEvent.type(screen.getByLabelText(/full name/i), "Ram Shrestha");
  await userEvent.type(screen.getByLabelText(/^phone$/i), "9800000000");
  await userEvent.type(screen.getByLabelText(/^address$/i), "Baneshwor, Kathmandu");
  await userEvent.type(screen.getByLabelText("City"), "Kathmandu");
};

const aSavedAddress = (overrides: Partial<SavedAddress> = {}): SavedAddress => ({
  id: "addr-1",
  label: "Home",
  fullName: "Sita Devi",
  phone: "9811111111",
  address: "Jhamsikhel, Ward 3",
  city: "Lalitpur",
  landmark: null,
  isDefault: true,
  ...overrides,
});

beforeEach(() => {
  isOnline = true;
  savedAddresses = [];
  checkoutMutateAsync.mockReset();
  initiatePaymentMutateAsync.mockReset();
  createAddressMutateAsync.mockReset();
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

  it("shows the default zone's delivery fee before a city is chosen", () => {
    renderCheckoutForm();

    expect(screen.getByText("Rs. 100")).toBeInTheDocument();
  });

  it("updates the delivery fee live once a city with its own zone is entered", async () => {
    renderCheckoutForm();

    await userEvent.type(screen.getByLabelText("City"), "Pokhara");

    expect(screen.getByText("Rs. 250")).toBeInTheDocument();
    expect(screen.queryByText("Rs. 100")).not.toBeInTheDocument();
  });

  it("offers to save a new address when the shopper has none saved", async () => {
    checkoutMutateAsync.mockResolvedValue({ id: "order-2", paymentMethod: "COD" });
    createAddressMutateAsync.mockResolvedValue({});
    renderCheckoutForm();

    const saveToggle = screen.getByLabelText(/save this address for next time/i);
    expect(saveToggle).toBeChecked();

    await fillRequiredFields();
    fireEvent.submit(screen.getByRole("button", { name: /place order/i }).closest("form")!);

    await vi.waitFor(() => expect(createAddressMutateAsync).toHaveBeenCalledTimes(1));
    expect(createAddressMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ address: "Baneshwor, Kathmandu", isDefault: true }),
    );
  });

  it("pre-selects the default saved address and hides the raw fields", async () => {
    savedAddresses = [aSavedAddress()];
    checkoutMutateAsync.mockResolvedValue({ id: "order-3", paymentMethod: "COD" });
    renderCheckoutForm();

    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Sita Devi")).toBeChecked();

    fireEvent.submit(screen.getByRole("button", { name: /place order/i }).closest("form")!);

    await vi.waitFor(() => expect(checkoutMutateAsync).toHaveBeenCalledTimes(1));
    expect(checkoutMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ fullName: "Sita Devi", city: "Lalitpur" }),
      }),
    );
    expect(createAddressMutateAsync).not.toHaveBeenCalled();
  });

  it("reveals a blank form when the shopper picks 'use a new address'", async () => {
    savedAddresses = [aSavedAddress()];
    renderCheckoutForm();

    await userEvent.click(screen.getByLabelText(/use a new address/i));

    expect(screen.getByLabelText(/full name/i)).toHaveValue("Ram Shrestha");
    expect(screen.getByLabelText(/^address$/i)).toHaveValue("");
    expect(screen.getByLabelText(/save this address for next time/i)).toBeInTheDocument();
  });
});
