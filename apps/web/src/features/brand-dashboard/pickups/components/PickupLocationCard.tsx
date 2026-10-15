"use client";

import { Badge, Button, Modal, toast } from "@outfiqe/design-system";
import { useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { PickupLocation } from "../api/pickupLocationSchemas";
import { PICKUP_COVERAGE_MESSAGE } from "../constants/pickupLocationMessages";
import { useMakeDefaultPickupLocation } from "../hooks/useMakeDefaultPickupLocation";
import { useRemovePickupLocation } from "../hooks/useRemovePickupLocation";
import { googleMapsLinkFor } from "../utils/pickupLocationForm.utils";
import { PickupLocationFormModal } from "./PickupLocationFormModal";

type PickupLocationCardProps = {
  pickupLocation: PickupLocation;
};

export const PickupLocationCard = ({ pickupLocation }: PickupLocationCardProps) => {
  const {
    id,
    label,
    contactName,
    contactPhone,
    address,
    landmark,
    city,
    latitude,
    longitude,
    openingNote,
    isDefault,
    isCoveredByOutfiqePickup,
  } = pickupLocation;

  const makeDefaultPickupLocation = useMakeDefaultPickupLocation();
  const removePickupLocation = useRemovePickupLocation();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);

  const makeDefault = async () => {
    try {
      await makeDefaultPickupLocation.mutateAsync(id);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const confirmRemove = async () => {
    try {
      await removePickupLocation.mutateAsync(id);
      setIsRemoveOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {isDefault && (
          <Badge tone="positive" showDot={false}>
            Default
          </Badge>
        )}
        <Badge tone={isCoveredByOutfiqePickup ? "success" : "neutral"} showDot={false}>
          {isCoveredByOutfiqePickup ? "Outfiqe pickup" : "You ship"}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-foreground">
        {contactName} · {contactPhone}
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {address}, {city}
        {landmark ? ` — ${landmark}` : ""}
      </p>
      {openingNote && <p className="text-[13px] text-muted-foreground">{openingNote}</p>}
      {latitude !== null && longitude !== null && (
        <a
          href={googleMapsLinkFor({ latitude, longitude })}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-[13px] font-medium text-primary underline-offset-4 hover:underline"
        >
          Open the map pin
        </a>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {isCoveredByOutfiqePickup
          ? PICKUP_COVERAGE_MESSAGE.COVERED
          : PICKUP_COVERAGE_MESSAGE.NOT_COVERED}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {!isDefault && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={makeDefault}
            disabled={makeDefaultPickupLocation.isPending}
          >
            Set as default
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
          Edit
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsRemoveOpen(true)}
          disabled={removePickupLocation.isPending}
        >
          Remove
        </Button>
      </div>

      {isEditOpen && (
        <PickupLocationFormModal
          pickupLocation={pickupLocation}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {isRemoveOpen && (
        <Modal
          open
          onClose={() => setIsRemoveOpen(false)}
          title="Remove this pickup location?"
          ariaLabel="Remove pickup location"
        >
          <p className="text-sm text-muted-foreground">
            Orders already placed keep the address they were collected from.
            {isDefault ? " Your oldest other location becomes the default." : ""}
          </p>
          <div className="mt-6 flex justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={() => setIsRemoveOpen(false)}>
              Keep it
            </Button>
            <Button type="button" onClick={confirmRemove} disabled={removePickupLocation.isPending}>
              Remove
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
