import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Address } from "../api/addressSchemas";
import { NEW_ADDRESS_OPTION, SavedAddressPicker } from "./SavedAddressPicker";

const anAddress = (overrides: Partial<Address> = {}): Address => ({
  id: "addr-1",
  label: "Home",
  fullName: "Sita Devi",
  phone: "9811111111",
  address: "Jhamsikhel, Ward 3",
  city: "Lalitpur",
  landmark: null,
  isDefault: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("SavedAddressPicker", () => {
  it("marks the selected address and always offers a new-address option", () => {
    render(
      <SavedAddressPicker
        addresses={[anAddress(), anAddress({ id: "addr-2", label: "Office" })]}
        selectedId="addr-2"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("radio", { name: /Office/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /use a new address/i })).not.toBeChecked();
  });

  it("reports the picked address id", async () => {
    const onSelect = vi.fn();
    render(
      <SavedAddressPicker
        addresses={[anAddress()]}
        selectedId={NEW_ADDRESS_OPTION}
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByRole("radio", { name: /Sita Devi/ }));
    expect(onSelect).toHaveBeenCalledWith("addr-1");
  });

  it("reports the new-address option", async () => {
    const onSelect = vi.fn();
    render(
      <SavedAddressPicker addresses={[anAddress()]} selectedId="addr-1" onSelect={onSelect} />,
    );

    await userEvent.click(screen.getByRole("radio", { name: /use a new address/i }));
    expect(onSelect).toHaveBeenCalledWith(NEW_ADDRESS_OPTION);
  });
});
