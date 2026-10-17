import { Button, Checkbox, FormBanner, Input, Label, Modal, toast } from "@outfiqe/design-system";
import { formatParcelCode } from "@outfiqe/utils";
import { useId, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import type { OrderToPack } from "../api/hubOperationsSchemas";
import {
  DEFAULT_PACKAGES_PER_PARCEL,
  DEFAULT_PARCEL_WEIGHT_GRAMS,
  MAX_PACKAGES_PER_PARCEL,
  MAX_PARCEL_WEIGHT_GRAMS,
} from "../constants/hubOperationLabels";
import { usePackParcel } from "../hooks/usePackParcel";

const NO_PICKUPS_COMING = 0;
const MIN_PARCEL_WEIGHT_GRAMS = 1;
const MIN_PACKAGES_PER_PARCEL = 1;

type PackParcelModalProps = { order: OrderToPack; onClose: () => void };

export const PackParcelModal = ({ order, onClose }: PackParcelModalProps) => {
  const packParcel = usePackParcel(order.orderId);
  const [weightGrams, setWeightGrams] = useState(String(DEFAULT_PARCEL_WEIGHT_GRAMS));
  const [parcelCount, setParcelCount] = useState(String(DEFAULT_PACKAGES_PER_PARCEL));
  const [packsOnlyPickupsAtHub, setPacksOnlyPickupsAtHub] = useState(false);
  const fieldIdPrefix = useId();
  const hasPickupsStillComing = order.pickupsStillComing > NO_PICKUPS_COMING;
  const parsedWeight = Number(weightGrams);
  const parsedCount = Number(parcelCount);
  const canPack =
    Number.isInteger(parsedWeight) &&
    parsedWeight >= MIN_PARCEL_WEIGHT_GRAMS &&
    parsedWeight <= MAX_PARCEL_WEIGHT_GRAMS &&
    Number.isInteger(parsedCount) &&
    parsedCount >= MIN_PACKAGES_PER_PARCEL &&
    parsedCount <= MAX_PACKAGES_PER_PARCEL &&
    (!hasPickupsStillComing || packsOnlyPickupsAtHub);

  const submitPacking = () => {
    packParcel.mutate(
      {
        partnerId: null,
        weightGrams: parsedWeight,
        parcelCount: parsedCount,
        packsOnlyPickupsAtHub,
      },
      {
        onSuccess: ({ trackingCode, booking }) => {
          toast.success(
            booking
              ? `Packed as ${formatParcelCode(trackingCode)}. Book it with ${booking.partnerName}.`
              : `Packed as ${formatParcelCode(trackingCode)}. Choose a delivery partner for it.`,
          );
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Pack ${order.customerName}'s parcel`}
      description="All the bags checked in for this order go into one parcel."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button onClick={submitPacking} disabled={!canPack} isLoading={packParcel.isPending}>
            Pack parcel
          </Button>
        </div>
      }
    >
      {packParcel.isError && <FormBanner>{getErrorMessage(packParcel.error)}</FormBanner>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${fieldIdPrefix}-weight`}>Weight (grams)</Label>
          <Input
            id={`${fieldIdPrefix}-weight`}
            type="number"
            inputMode="numeric"
            min={MIN_PARCEL_WEIGHT_GRAMS}
            max={MAX_PARCEL_WEIGHT_GRAMS}
            value={weightGrams}
            onChange={(event) => setWeightGrams(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`${fieldIdPrefix}-count`}>Boxes or bags</Label>
          <Input
            id={`${fieldIdPrefix}-count`}
            type="number"
            inputMode="numeric"
            min={MIN_PACKAGES_PER_PARCEL}
            max={MAX_PACKAGES_PER_PARCEL}
            value={parcelCount}
            onChange={(event) => setParcelCount(event.target.value)}
          />
        </div>
      </div>
      {hasPickupsStillComing && (
        <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-foreground">
          <Checkbox
            checked={packsOnlyPickupsAtHub}
            onChange={(event) => setPacksOnlyPickupsAtHub(event.target.checked)}
          />
          <span>
            {order.pickupsStillComing} more bag(s) haven&apos;t arrived. Pack only what&apos;s here
            now; the rest will go in a second parcel.
          </span>
        </label>
      )}
    </Modal>
  );
};
