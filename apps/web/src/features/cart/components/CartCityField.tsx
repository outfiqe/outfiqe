"use client";

import { CityZoneOptions, resolveZonePreview, useDeliveryZones } from "@/features/delivery-zones";

import { useUpdateCartCity } from "../hooks/useUpdateCartCity";

const selectClass =
  "flex h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-foreground " +
  "outline-none transition-colors focus-visible:border-foreground " +
  "disabled:cursor-not-allowed disabled:opacity-50";

type CartCityFieldProps = {
  city: string | null;
};

export const CartCityField = ({ city }: CartCityFieldProps) => {
  const deliveryZonesQuery = useDeliveryZones();
  const updateCity = useUpdateCartCity();

  const changeCity = (value: string) => {
    if (!value || value === city) return;
    updateCity.mutate(value);
  };

  const previewZone = deliveryZonesQuery.data
    ? resolveZonePreview(deliveryZonesQuery.data, city ?? "")
    : undefined;

  return (
    <div className="mb-5 space-y-1.5 rounded-2xl border border-border p-5">
      <label htmlFor="cart-city" className="block text-xs font-medium text-muted-foreground">
        Delivering to
      </label>
      <select
        id="cart-city"
        value={city ?? ""}
        onChange={(e) => changeCity(e.target.value)}
        disabled={updateCity.isPending}
        className={selectClass}
      >
        <CityZoneOptions currentCity={city} />
      </select>
      {previewZone && city && (
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
