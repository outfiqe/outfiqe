import { Button, FormBanner, Label, Modal, Select } from "@outfiqe/design-system";
import { useId, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import {
  PARCEL_RETURN_OUTCOMES,
  type ParcelDetail,
  type ParcelReturnOutcome,
} from "../api/parcelsSchemas";
import { RETURN_OUTCOME_HINTS, RETURN_OUTCOME_LABELS } from "../constants/parcelLabels";
import { useCheckInReturn } from "../hooks/useCheckInReturn";

const NO_UNITS = 0;
const NONE_RESELLABLE_OPTION = 1;
const DEFAULT_OUTCOME: ParcelReturnOutcome = "CUSTOMER_REFUSED_OR_UNREACHABLE";
const RESELLABLE_BY_DEFAULT: Record<ParcelReturnOutcome, boolean> = {
  CUSTOMER_REFUSED_OR_UNREACHABLE: true,
  WRONG_OR_DAMAGED_ITEM: false,
  PARTNER_DAMAGED_OR_LOST: false,
};

type ReturnCheckInModalProps = { parcel: ParcelDetail; onClose: () => void };

const readOutcome = (value: string): ParcelReturnOutcome =>
  PARCEL_RETURN_OUTCOMES.find((outcome) => outcome === value) ?? DEFAULT_OUTCOME;

export const ReturnCheckInModal = ({ parcel, onClose }: ReturnCheckInModalProps) => {
  const checkInReturn = useCheckInReturn(parcel.shipmentId);
  const [outcome, setOutcome] = useState<ParcelReturnOutcome>(DEFAULT_OUTCOME);
  const [resellableByItemId, setResellableByItemId] = useState<Record<string, number>>({});
  const outcomeFieldId = useId();
  const itemsStillInParcel = parcel.pickups.flatMap(({ brandName, items }) =>
    items.filter(({ units }) => units > NO_UNITS).map((item) => ({ ...item, brandName })),
  );

  const resellableUnitsFor = (orderItemId: string, units: number) =>
    resellableByItemId[orderItemId] ?? (RESELLABLE_BY_DEFAULT[outcome] ? units : NO_UNITS);

  const submitReturn = () => {
    checkInReturn.mutate(
      {
        outcome,
        lines: itemsStillInParcel.map(({ orderItemId, units }) => {
          const resellableQty = resellableUnitsFor(orderItemId, units);
          return { orderItemId, resellableQty, damagedQty: units - resellableQty };
        }),
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Check in returned parcel ${parcel.displayTrackingCode}`}
      description="Confirm why it came back and check every item. Refunds follow from what you choose."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submitReturn} isLoading={checkInReturn.isPending}>
            Check in return
          </Button>
        </div>
      }
    >
      {checkInReturn.isError && <FormBanner>{getErrorMessage(checkInReturn.error)}</FormBanner>}
      <div className="space-y-4">
        <div>
          <Label htmlFor={outcomeFieldId}>Why it came back</Label>
          <Select
            id={outcomeFieldId}
            value={outcome}
            onChange={(event) => {
              setOutcome(readOutcome(event.target.value));
              setResellableByItemId({});
            }}
          >
            {PARCEL_RETURN_OUTCOMES.map((returnOutcome) => (
              <option key={returnOutcome} value={returnOutcome}>
                {RETURN_OUTCOME_LABELS[returnOutcome]}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">{RETURN_OUTCOME_HINTS[outcome]}</p>
        </div>
        <ul className="space-y-3">
          {itemsStillInParcel.map(({ orderItemId, productName, sizeLabel, units, brandName }) => {
            const resellableFieldId = `resellable-${orderItemId}`;
            return (
              <li key={orderItemId} className="flex items-center justify-between gap-3 text-sm">
                <label htmlFor={resellableFieldId} className="text-foreground">
                  {brandName} · {productName} · {sizeLabel} × {units}
                </label>
                <Select
                  id={resellableFieldId}
                  className="w-40"
                  value={resellableUnitsFor(orderItemId, units)}
                  onChange={(event) =>
                    setResellableByItemId((current) => ({
                      ...current,
                      [orderItemId]: Number(event.target.value),
                    }))
                  }
                >
                  {Array.from({ length: units + NONE_RESELLABLE_OPTION }, (_, resellableUnits) => (
                    <option key={resellableUnits} value={resellableUnits}>
                      {resellableUnits} fine, {units - resellableUnits} damaged
                    </option>
                  ))}
                </Select>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
};
