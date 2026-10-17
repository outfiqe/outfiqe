import { Button, FormBanner, Label, Modal, Select, Textarea, toast } from "@outfiqe/design-system";
import { useId, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import type { PickupAtHub } from "../api/hubOperationsSchemas";
import { useRecordInspection } from "../hooks/useRecordInspection";

const NO_FAILED_UNITS = 0;
const ZERO_OPTION_COUNT = 1;
const MAX_NOTE_LENGTH = 500;

type InspectionModalProps = { pickup: PickupAtHub; onClose: () => void };

export const InspectionModal = ({ pickup, onClose }: InspectionModalProps) => {
  const recordInspection = useRecordInspection();
  const [failedUnitsByItemId, setFailedUnitsByItemId] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const fieldIdPrefix = useId();
  const totalFailedUnits = Object.values(failedUnitsByItemId).reduce(
    (sum, units) => sum + units,
    NO_FAILED_UNITS,
  );

  const submitInspection = () => {
    const trimmedNote = note.trim();
    recordInspection.mutate(
      {
        groupId: pickup.fulfilmentGroupId,
        lines: pickup.items.map(({ orderItemId }) => ({
          orderItemId,
          failedQty: failedUnitsByItemId[orderItemId] ?? NO_FAILED_UNITS,
        })),
        ...(trimmedNote ? { note: trimmedNote } : {}),
      },
      {
        onSuccess: ({ failedUnits }) => {
          toast.success(
            failedUnits > NO_FAILED_UNITS
              ? `Saved. The customer is refunded for ${failedUnits} unit(s).`
              : "Everything passed.",
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
      title={`Inspect ${pickup.brandName}'s bag`}
      description="Mark any units that are damaged, wrong or missing. Those are refunded to the customer and the rest carry on."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button onClick={submitInspection} isLoading={recordInspection.isPending}>
            {totalFailedUnits > NO_FAILED_UNITS ? "Save and refund" : "Everything passed"}
          </Button>
        </div>
      }
    >
      {recordInspection.isError && (
        <FormBanner>{getErrorMessage(recordInspection.error)}</FormBanner>
      )}
      <ul className="space-y-3">
        {pickup.items.map(({ orderItemId, productName, sizeLabel, units }) => {
          const failedInputId = `${fieldIdPrefix}-${orderItemId}`;
          return (
            <li key={orderItemId} className="flex items-center justify-between gap-3 text-sm">
              <label htmlFor={failedInputId} className="text-foreground">
                {productName} · {sizeLabel} × {units}
              </label>
              <Select
                id={failedInputId}
                className="w-32"
                value={failedUnitsByItemId[orderItemId] ?? NO_FAILED_UNITS}
                onChange={(event) =>
                  setFailedUnitsByItemId((current) => ({
                    ...current,
                    [orderItemId]: Number(event.target.value),
                  }))
                }
              >
                {Array.from({ length: units + ZERO_OPTION_COUNT }, (_, failedUnits) => (
                  <option key={failedUnits} value={failedUnits}>
                    {failedUnits === NO_FAILED_UNITS ? "All fine" : `${failedUnits} failed`}
                  </option>
                ))}
              </Select>
            </li>
          );
        })}
      </ul>
      <div className="mt-4">
        <Label htmlFor={`${fieldIdPrefix}-note`}>What was wrong? (optional)</Label>
        <Textarea
          id={`${fieldIdPrefix}-note`}
          value={note}
          maxLength={MAX_NOTE_LENGTH}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
    </Modal>
  );
};
