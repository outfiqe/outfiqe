"use client";

import { Button, FormBanner, Label, Modal, Select, Textarea, toast } from "@outfiqe/design-system";
import { useId, useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { BrandShipmentItem } from "../api/brandFulfilmentSchemas";
import {
  UNAVAILABLE_REASON_MAX_LENGTH,
  UNAVAILABLE_REASON_MIN_LENGTH,
} from "../constants/unavailableItemLabels";
import { useReportUnavailableItems } from "../hooks/useReportUnavailableItems";

const NOTHING_CHOSEN = 0;
const NONE_OPTION_COUNT = 1;

type ReportUnavailableItemsModalProps = {
  groupId: string;
  items: BrandShipmentItem[];
  onClose: () => void;
};

const unitsStillOrdered = (item: BrandShipmentItem) => item.qty - item.refundedQty;

export const ReportUnavailableItemsModal = ({
  groupId,
  items,
  onClose,
}: ReportUnavailableItemsModalProps) => {
  const reportUnavailable = useReportUnavailableItems(groupId);
  const [chosenUnitsByItemId, setChosenUnitsByItemId] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const reasonInputId = useId();
  const reportableItems = items.filter((item) => unitsStillOrdered(item) > NOTHING_CHOSEN);
  const lines = Object.entries(chosenUnitsByItemId)
    .filter(([, qty]) => qty > NOTHING_CHOSEN)
    .map(([orderItemId, qty]) => ({ orderItemId, qty }));
  const trimmedReason = reason.trim();
  const canSubmit =
    lines.length > NOTHING_CHOSEN && trimmedReason.length >= UNAVAILABLE_REASON_MIN_LENGTH;

  const submitUnavailableReport = () => {
    reportUnavailable.mutate(
      { lines, reason: trimmedReason },
      {
        onSuccess: () => {
          toast.success("Sent to Outfiqe. We'll refund the buyer once it's approved.");
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Can't supply an item"
      description="Tell us which items you can't send. Outfiqe reviews it and refunds the buyer for those items. Pack and send everything else as usual."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button
            onClick={submitUnavailableReport}
            disabled={!canSubmit}
            isLoading={reportUnavailable.isPending}
          >
            Send to Outfiqe
          </Button>
        </div>
      }
    >
      {reportUnavailable.isError && (
        <FormBanner>{getErrorMessage(reportUnavailable.error)}</FormBanner>
      )}
      <ul className="space-y-3">
        {reportableItems.map((item) => {
          const quantityInputId = `unavailable-qty-${item.id}`;
          return (
            <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <label htmlFor={quantityInputId} className="text-foreground">
                {item.productName} · {item.sizeLabel}
              </label>
              <Select
                id={quantityInputId}
                className="w-32"
                value={chosenUnitsByItemId[item.id] ?? NOTHING_CHOSEN}
                onChange={(event) =>
                  setChosenUnitsByItemId((current) => ({
                    ...current,
                    [item.id]: Number(event.target.value),
                  }))
                }
              >
                {Array.from({ length: unitsStillOrdered(item) + NONE_OPTION_COUNT }, (_, units) => (
                  <option key={units} value={units}>
                    {units === NOTHING_CHOSEN ? "Can supply" : `${units} missing`}
                  </option>
                ))}
              </Select>
            </li>
          );
        })}
      </ul>
      <div className="mt-4">
        <Label htmlFor={reasonInputId}>What happened?</Label>
        <Textarea
          id={reasonInputId}
          value={reason}
          maxLength={UNAVAILABLE_REASON_MAX_LENGTH}
          placeholder="e.g. The last one in this size was damaged."
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
    </Modal>
  );
};
