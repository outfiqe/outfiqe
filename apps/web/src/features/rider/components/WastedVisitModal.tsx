"use client";

import { Button, FormBanner, Label, Modal, Textarea, toast } from "@outfiqe/design-system";
import { useId, useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { useMarkVisitWasted } from "../hooks/useMarkVisitWasted";

const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 200;

type WastedVisitModalProps = {
  taskId: string;
  open: boolean;
  onClose: () => void;
};

export const WastedVisitModal = ({ taskId, open, onClose }: WastedVisitModalProps) => {
  const markVisitWasted = useMarkVisitWasted(taskId);
  const [reason, setReason] = useState("");
  const reasonInputId = useId();
  const canSubmit = reason.trim().length >= MIN_REASON_LENGTH && !markVisitWasted.isPending;

  const submitWastedVisit = () => {
    markVisitWasted.mutate(reason.trim(), {
      onSuccess: () => {
        toast.success("Visit marked as wasted. The pickups go back on the board.");
        onClose();
      },
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nothing to collect?"
      description="Tell the hub why so they can follow up with the brand."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button
            onClick={submitWastedVisit}
            disabled={!canSubmit}
            isLoading={markVisitWasted.isPending}
          >
            Mark as wasted
          </Button>
        </div>
      }
    >
      {markVisitWasted.isError && <FormBanner>{getErrorMessage(markVisitWasted.error)}</FormBanner>}
      <Label htmlFor={reasonInputId}>What happened?</Label>
      <Textarea
        id={reasonInputId}
        value={reason}
        maxLength={MAX_REASON_LENGTH}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Shop was closed, bags weren't ready…"
      />
    </Modal>
  );
};
