"use client";

import { Button, FormBanner, Skeleton } from "@outfiqe/design-system";
import { useState } from "react";

import { usePickupLocations } from "../hooks/usePickupLocations";
import { PickupLocationCard } from "./PickupLocationCard";
import { PickupLocationFormModal } from "./PickupLocationFormModal";

const LOADING_CARD_COUNT = 2;
const NO_LOCATIONS = 0;

export const PickupLocationsSection = () => {
  const { data: pickupLocations, isPending, isError } = usePickupLocations();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const locationCount = pickupLocations?.length ?? NO_LOCATIONS;

  return (
    <section
      className="rounded-2xl border border-border p-5"
      aria-labelledby="pickup-locations-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1
            id="pickup-locations-heading"
            className="font-display text-sm font-bold uppercase tracking-wide text-foreground"
          >
            Pickup locations
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Where Outfiqe riders collect your orders. Orders use your default location.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(true)}>
          Add location
        </Button>
      </div>

      {isError && (
        <div className="mt-4">
          <FormBanner>
            We couldn&apos;t load your pickup locations right now. Please try again.
          </FormBanner>
        </div>
      )}

      {isPending && !isError && (
        <div className="mt-4 space-y-3" aria-busy="true" aria-label="Loading pickup locations">
          {Array.from({ length: LOADING_CARD_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-[120px] w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!isPending && !isError && locationCount === NO_LOCATIONS && (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No pickup location yet. Add the address where you hand over parcels.
          </p>
        </div>
      )}

      {!isError && locationCount > NO_LOCATIONS && (
        <div className="mt-4 space-y-3">
          {pickupLocations?.map((pickupLocation) => (
            <PickupLocationCard key={pickupLocation.id} pickupLocation={pickupLocation} />
          ))}
        </div>
      )}

      {isAddModalOpen && <PickupLocationFormModal onClose={() => setIsAddModalOpen(false)} />}
    </section>
  );
};
