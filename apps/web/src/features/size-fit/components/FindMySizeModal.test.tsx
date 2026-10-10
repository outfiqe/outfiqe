import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FindMySizeModal, type FitSize } from "./FindMySizeModal";

const saveMutate = vi.fn();
const authState = { isAuthenticated: false };
const fitProfileState: { data: { heightCm: number; weightKg: number } | null } = { data: null };

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("../hooks/useFitProfile", () => ({
  useFitProfile: () => fitProfileState,
  useSaveFitProfile: () => ({ mutate: saveMutate, isPending: false }),
}));

vi.mock("@outfiqe/design-system", async () => {
  const actual = await vi.importActual("@outfiqe/design-system");
  return { ...actual, toast: { success: vi.fn(), error: vi.fn() } };
});

const sizes: FitSize[] = [
  {
    id: "size-m",
    label: "M",
    inStock: true,
    fitRange: { minHeightCm: 160, maxHeightCm: 170, minWeightKg: 55, maxWeightKg: 65 },
  },
  {
    id: "size-l",
    label: "L",
    inStock: false,
    fitRange: { minHeightCm: 170, maxHeightCm: 180, minWeightKg: 65, maxWeightKg: 75 },
  },
];

const renderModal = () => {
  const callbacks = { onClose: vi.fn(), onSelectSize: vi.fn() };
  render(
    <FindMySizeModal
      open
      productName="Linen Kurta"
      sizes={sizes}
      isStretchable={false}
      {...callbacks}
    />,
  );
  return callbacks;
};

const enterMeasurements = (heightCm: string, weightKg: string) => {
  fireEvent.change(screen.getByLabelText("Height (cm)"), { target: { value: heightCm } });
  fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: weightKg } });
};

beforeEach(() => {
  authState.isAuthenticated = false;
  fitProfileState.data = null;
  saveMutate.mockReset();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("FindMySizeModal", () => {
  it("recommends a size, remembers the measurements and selects it", () => {
    const { onClose, onSelectSize } = renderModal();

    enterMeasurements("165", "60");
    expect(screen.getByText("Your size: M")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select M" }));

    expect(onSelectSize).toHaveBeenCalledWith("size-m");
    expect(onClose).toHaveBeenCalled();
    expect(window.localStorage.getItem("outfiqe.fit-measurements")).toBe(
      JSON.stringify({ heightCm: 165, weightKg: 60 }),
    );
  });

  it("says when the recommended size is sold out", () => {
    renderModal();

    enterMeasurements("175", "70");

    expect(screen.getByRole("button", { name: "L is sold out" })).toBeDisabled();
  });

  it("explains measurements outside the bounds", () => {
    renderModal();

    enterMeasurements("400", "60");

    expect(screen.getByText(/Enter a height from 50 to 230 cm/)).toBeInTheDocument();
  });

  it("prefills the shopper's saved measurements and links to everything that fits", () => {
    fitProfileState.data = { heightCm: 165, weightKg: 60 };
    renderModal();

    expect(screen.getByLabelText("Height (cm)")).toHaveValue("165");
    expect(screen.getByRole("link", { name: "See everything that fits you" })).toHaveAttribute(
      "href",
      "/fit?heightCm=165&weightKg=60",
    );
  });

  it("prefills measurements remembered on this device", () => {
    window.localStorage.setItem(
      "outfiqe.fit-measurements",
      JSON.stringify({ heightCm: 172, weightKg: 68 }),
    );
    renderModal();

    expect(screen.getByLabelText("Weight (kg)")).toHaveValue("68");
  });

  it("offers a signed-in shopper to save the measurements to their account", () => {
    authState.isAuthenticated = true;
    renderModal();

    enterMeasurements("165", "60");
    fireEvent.click(screen.getByRole("button", { name: "Save to my account" }));

    expect(saveMutate).toHaveBeenCalledWith({ heightCm: 165, weightKg: 60 }, expect.any(Object));
  });

  it("doesn't offer saving to a guest", () => {
    renderModal();

    enterMeasurements("165", "60");

    expect(screen.queryByRole("button", { name: "Save to my account" })).not.toBeInTheDocument();
  });
});
