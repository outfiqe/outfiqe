"use client";

import { Button, Modal, toast } from "@outfiqe/design-system";
import { useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { useRequestShipmentCancellation } from "../hooks/useRequestShipmentCancellation";

const REASON_MIN_LENGTH = 5;

type RequestShipmentCancellationModalProps = {
  groupId: string;
  open: boolean;
  onClose: () => void;
};

export const RequestShipmentCancellationModal = ({
  groupId,
  open,
  onClose,
}: RequestShipmentCancellationModalProps) => {
  const requestCancellation = useRequestShipmentCancellation(groupId);
  const [reason, setReason] = useState("");

  const close = () => {
    setReason("");
    onClose();
  };

  const canSubmit = reason.trim().length >= REASON_MIN_LENGTH;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      await requestCancellation.mutateAsync(reason.trim());
      toast.success("Cancellation requested — our team will review it");
      close();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Request cancellation"
      description="Tell us why this shipment can't be fulfilled. A team member reviews the request and processes any refund."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close}>
            Back
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={!canSubmit || requestCancellation.isPending}
          >
            {requestCancellation.isPending ? "Sending…" : "Send request"}
          </Button>
        </div>
      }
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-foreground">Reason</span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          placeholder="e.g. This item sold out in-store before we could pack it."
          className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground"
          autoFocus
        />
      </label>
    </Modal>
  );
};
