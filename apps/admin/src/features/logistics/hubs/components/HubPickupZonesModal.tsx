import { Button, Checkbox, FormBanner, Modal, Skeleton } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { deliveryZonesApi } from "@/features/delivery-zones/api/deliveryZonesApi";
import { getErrorMessage } from "@/lib/errorMessages";

import { hubsApi } from "../api/hubsApi";
import type { Hub } from "../api/hubsSchemas";
import { HUBS_QUERY_KEY } from "../constants/hubQueryKeys";

type HubPickupZonesModalProps = {
  hub: Hub;
  onClose: () => void;
};

const LOADING_ROW_COUNT = 3;
const NO_ZONES = 0;
const PICKUP_ZONE_CHOICES_QUERY_KEY = ["logistics-hub-pickup-zone-choices"] as const;

export const HubPickupZonesModal = ({ hub, onClose }: HubPickupZonesModalProps) => {
  const [selectedZoneIds, setSelectedZoneIds] = useState(
    () => new Set(hub.pickupZones.map((zone) => zone.id)),
  );
  const {
    data: zones,
    isPending,
    isError,
  } = useQuery({ queryKey: PICKUP_ZONE_CHOICES_QUERY_KEY, queryFn: deliveryZonesApi.list });
  const countryZones = zones?.filter((zone) => zone.countryCode === hub.countryCode) ?? [];

  const savePickupZones = useApiMutation({
    mutationFn: () => hubsApi.setPickupZones(hub.id, [...selectedZoneIds]),
    invalidateKeys: [HUBS_QUERY_KEY],
    successMessage: "Pickup areas saved.",
    onSuccess: onClose,
  });

  const toggleZone = (zoneId: string, isSelected: boolean) =>
    setSelectedZoneIds((currentZoneIds) => {
      const nextZoneIds = new Set(currentZoneIds);
      if (isSelected) nextZoneIds.add(zoneId);
      else nextZoneIds.delete(zoneId);
      return nextZoneIds;
    });

  const title = `Pickup areas for ${hub.name}`;

  return (
    <Modal open onClose={onClose} title={title} ariaLabel={title}>
      <p className="text-sm text-muted-foreground">
        Riders from this hub collect from brands whose pickup city is in these delivery zones.
      </p>

      {savePickupZones.isError && (
        <FormBanner className="mt-3">{getErrorMessage(savePickupZones.error)}</FormBanner>
      )}
      {isError && (
        <FormBanner className="mt-3">We couldn&apos;t load the delivery zones.</FormBanner>
      )}

      <div className="mt-4 space-y-2">
        {isPending &&
          Array.from({ length: LOADING_ROW_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-lg" />
          ))}
        {!isPending && !isError && countryZones.length === NO_ZONES && (
          <p className="text-sm text-muted-foreground">
            No delivery zones in this country yet. Add them under Delivery zones first.
          </p>
        )}
        {countryZones.map((zone) => (
          <label
            key={zone.id}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border p-3 text-sm text-foreground"
          >
            <Checkbox
              checked={selectedZoneIds.has(zone.id)}
              onChange={(event) => toggleZone(zone.id, event.target.checked)}
            />
            <span className="font-medium">{zone.name}</span>
            <span className="text-muted-foreground">{zone.cities.join(", ")}</span>
          </label>
        ))}
      </div>

      <div className="flex justify-end gap-2.5 pt-5">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={savePickupZones.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => savePickupZones.mutate()}
          disabled={savePickupZones.isPending || isPending}
        >
          {savePickupZones.isPending ? "Saving…" : "Save pickup areas"}
        </Button>
      </div>
    </Modal>
  );
};
