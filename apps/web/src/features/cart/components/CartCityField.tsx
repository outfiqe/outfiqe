"use client";

import { Input } from "@outfiqe/design-system";
import { useRef, useState } from "react";

import { resolveZonePreview, useDeliveryZones } from "@/features/delivery-zones";

import { useUpdateCartCity } from "../hooks/useUpdateCartCity";

const CITY_SAVE_DEBOUNCE_MS = 600;

type CartCityFieldProps = {
  city: string | null;
};

export const CartCityField = ({ city }: CartCityFieldProps) => {
  const [cityInput, setCityInput] = useState(city ?? "");
  const deliveryZonesQuery = useDeliveryZones();
  const updateCity = useUpdateCartCity();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const changeCityInput = (value: string) => {
    setCityInput(value);

    clearTimeout(saveTimeoutRef.current);
    const trimmedValue = value.trim();
    if (!trimmedValue || trimmedValue === city) return;
    saveTimeoutRef.current = setTimeout(
      () => updateCity.mutate(trimmedValue),
      CITY_SAVE_DEBOUNCE_MS,
    );
  };

  const previewZone = deliveryZonesQuery.data
    ? resolveZonePreview(deliveryZonesQuery.data, cityInput)
    : undefined;

  return (
    <div className="mb-5 space-y-1.5 rounded-2xl border border-border p-5">
      <label htmlFor="cart-city" className="block text-xs font-medium text-muted-foreground">
        Delivering to
      </label>
      <Input
        id="cart-city"
        placeholder="Enter your city"
        value={cityInput}
        onChange={(e) => changeCityInput(e.target.value)}
      />
      {previewZone && cityInput.trim() && (
        <p className="text-xs text-muted-foreground">
          {previewZone.standardDeliveryFee === 0
            ? "Free delivery"
            : `Rs. ${previewZone.standardDeliveryFee.toLocaleString()} delivery`}{" "}
          · free over Rs. {previewZone.freeDeliveryThreshold.toLocaleString()}
        </p>
      )}
    </div>
  );
};
