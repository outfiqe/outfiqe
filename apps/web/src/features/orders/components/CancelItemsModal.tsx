"use client";

import { Button, FormBanner, Label, Modal, Select, Textarea, toast } from "@outfiqe/design-system";
import { useId, useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { OrderItem } from "../api/orderSchemas";
import { useCancelOrderItems } from "../hooks/useCancelOrderItems";

const NOTHING_CHOSEN = 0;
const MAX_REASON_LENGTH = 500;
const KEEP_OPTION_COUNT = 1;

type CancelItemsModalProps = {
  orderId: string;
  cancellableItems: OrderItem[];
  onClose: () => void;
};

const remainingUnits = (item: OrderItem) => item.qty - item.refundedQty;

export const CancelItemsModal = ({ orderId, cancellableItems, onClose }: CancelItemsModalProps) => {
  const cancelItems = useCancelOrderItems(orderId);
  const [chosenUnitsByItemId, setChosenUnitsByItemId] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const reasonInputId = useId();
  const lines = Object.entries(chosenUnitsByItemId)
    .filter(([, qty]) => qty > NOTHING_CHOSEN)
    .map(([orderItemId, qty]) => ({ orderItemId, qty }));

  const submitCancellation = () => {
    const trimmedReason = reason.trim();
    cancelItems.mutate(
      { lines, ...(trimmedReason ? { reason: trimmedReason } : {}) },
      {
        onSuccess: (refund) => {
          toast.success(`Cancelled. Rs. ${refund.totalAmount.toLocaleString()} will be refunded.`);
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Cancel items"
      description="Choose what you no longer want. You can cancel items until the brand hands them over."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Keep everything
          </Button>
          <Button
            onClick={submitCancellation}
            disabled={lines.length === NOTHING_CHOSEN}
            isLoading={cancelItems.isPending}
          >
            Cancel chosen items
          </Button>
        </div>
      }
    >
      {cancelItems.isError && <FormBanner>{getErrorMessage(cancelItems.error)}</FormBanner>}
      <ul className="space-y-3">
        {cancellableItems.map((item) => {
          const quantityInputId = `cancel-qty-${item.id}`;
          return (
            <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <label htmlFor={quantityInputId} className="text-foreground">
                {item.productName} · {item.sizeLabel}
              </label>
              <Select
                id={quantityInputId}
                className="w-24"
                value={chosenUnitsByItemId[item.id] ?? NOTHING_CHOSEN}
                onChange={(event) =>
                  setChosenUnitsByItemId((current) => ({
                    ...current,
                    [item.id]: Number(event.target.value),
                  }))
                }
              >
                {Array.from({ length: remainingUnits(item) + KEEP_OPTION_COUNT }, (_, units) => (
                  <option key={units} value={units}>
                    {units === NOTHING_CHOSEN ? "Keep" : `Cancel ${units}`}
                  </option>
                ))}
              </Select>
            </li>
          );
        })}
      </ul>
      <div className="mt-4">
        <Label htmlFor={reasonInputId}>Why are you cancelling? (optional)</Label>
        <Textarea
          id={reasonInputId}
          value={reason}
          maxLength={MAX_REASON_LENGTH}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
    </Modal>
  );
};
