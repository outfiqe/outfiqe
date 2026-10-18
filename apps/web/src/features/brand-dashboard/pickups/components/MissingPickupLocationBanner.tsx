"use client";

import Link from "next/link";

import { MISSING_PICKUP_LOCATION_MESSAGE } from "../constants/pickupLocationMessages";
import { usePickupLocations } from "../hooks/usePickupLocations";

const NO_LOCATIONS = 0;

export const MissingPickupLocationBanner = () => {
  const { data: pickupLocations, isSuccess } = usePickupLocations();
  const hasNoPickupLocation =
    isSuccess && (pickupLocations?.length ?? NO_LOCATIONS) === NO_LOCATIONS;
  if (!hasNoPickupLocation) return null;

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4"
    >
      <p className="text-sm text-foreground">{MISSING_PICKUP_LOCATION_MESSAGE}</p>
      <Link
        href="/pickup-locations"
        className="cursor-pointer text-sm font-semibold text-primary-strong underline-offset-4 hover:underline"
      >
        Add pickup location
      </Link>
    </div>
  );
};
