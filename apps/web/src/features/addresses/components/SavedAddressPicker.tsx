"use client";

import { cn } from "@/shared/lib/cn";

import type { Address } from "../api/addressSchemas";

export const NEW_ADDRESS_OPTION = "new" as const;

type SavedAddressPickerProps = {
  addresses: Address[];
  selectedId: string | typeof NEW_ADDRESS_OPTION;
  onSelect: (value: string | typeof NEW_ADDRESS_OPTION) => void;
};

const optionClassName = (isSelected: boolean) =>
  cn(
    "flex cursor-pointer gap-3 rounded-xl border p-3 text-sm transition-colors",
    isSelected ? "border-foreground bg-muted/40" : "border-border hover:border-foreground/40",
  );

export const SavedAddressPicker = ({
  addresses,
  selectedId,
  onSelect,
}: SavedAddressPickerProps) => {
  return (
    <div
      role="radiogroup"
      aria-label="Choose a delivery address"
      className="grid gap-2 sm:grid-cols-2"
    >
      {addresses.map((address) => {
        const isSelected = selectedId === address.id;
        return (
          <label key={address.id} className={optionClassName(isSelected)}>
            <input
              type="radio"
              name="saved-address"
              className="mt-1 size-4 shrink-0 accent-foreground"
              checked={isSelected}
              onChange={() => onSelect(address.id)}
            />
            <span className="min-w-0">
              <span className="block font-semibold text-foreground">
                {address.label ? `${address.label} · ` : ""}
                {address.fullName}
              </span>
              <span className="block truncate text-muted-foreground">
                {address.address}, {address.city}
              </span>
              <span className="block text-muted-foreground">{address.phone}</span>
            </span>
          </label>
        );
      })}

      <label className={optionClassName(selectedId === NEW_ADDRESS_OPTION)}>
        <input
          type="radio"
          name="saved-address"
          className="mt-1 size-4 shrink-0 accent-foreground"
          checked={selectedId === NEW_ADDRESS_OPTION}
          onChange={() => onSelect(NEW_ADDRESS_OPTION)}
        />
        <span className="font-semibold text-foreground">Use a new address</span>
      </label>
    </div>
  );
};
