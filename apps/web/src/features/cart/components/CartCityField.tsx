"use client";

import { useEffect, useRef } from "react";

import { useAddresses } from "@/features/addresses";
import {
  CityAutocomplete,
  isListedCity,
  resolveZonePreview,
  useDeliveryZones,
} from "@/features/delivery-zones";

import { useUpdateCartCity } from "../hooks/useUpdateCartCity";

type CartCityFieldProps = {
  city: string | null;
};

export const CartCityField = ({ city }: CartCityFieldProps) => {
  const deliveryZonesQuery = useDeliveryZones();
  const updateCity = useUpdateCartCity();
  const { data: savedAddresses } = useAddresses();
  const hasTriedAddressCity = useRef(false);

  const defaultAddressCity = savedAddresses?.find((savedAddress) => savedAddress.isDefault)?.city;
  const deliveryZones = deliveryZonesQuery.data;
  const canFillCityFromDefaultAddress =
    city === null &&
    defaultAddressCity !== undefined &&
    deliveryZones !== undefined &&
    isListedCity(deliveryZones, defaultAddressCity);

  const { mutate: saveCartCity } = updateCity;
  useEffect(() => {
    if (!canFillCityFromDefaultAddress || defaultAddressCity === undefined) return;
    if (hasTriedAddressCity.current) return;
    hasTriedAddressCity.current = true;
    saveCartCity(defaultAddressCity);
  }, [canFillCityFromDefaultAddress, defaultAddressCity, saveCartCity]);

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
      <CityAutocomplete
        id="cart-city"
        value={city ?? ""}
        onChange={changeCity}
        disabled={updateCity.isPending}
      />
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
