"use client";

import { Button, Input, Modal, toast } from "@outfiqe/design-system";
import { useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { useAdvanceShipment } from "../hooks/useAdvanceShipment";

type MarkShipmentShippedModalProps = {
  groupId: string;
  open: boolean;
  onClose: () => void;
};

export const MarkShipmentShippedModal = ({
  groupId,
  open,
  onClose,
}: MarkShipmentShippedModalProps) => {
  const advanceShipment = useAdvanceShipment(groupId);
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  const close = () => {
    setCarrier("");
    setTrackingNumber("");
    onClose();
  };

  const canSubmit = carrier.trim().length > 0 && trackingNumber.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      await advanceShipment.mutateAsync({
        status: "SHIPPED",
        carrier: carrier.trim(),
        trackingNumber: trackingNumber.trim(),
      });
      toast.success("Shipment marked as shipped");
      close();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Mark as shipped"
      description="Add the carrier and tracking number so the buyer can follow the parcel."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!canSubmit || advanceShipment.isPending}>
            {advanceShipment.isPending ? "Saving…" : "Mark shipped"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-foreground">Carrier</span>
          <Input
            value={carrier}
            onChange={(event) => setCarrier(event.target.value)}
            placeholder="e.g. Pathao, NCM, Aramex"
            autoFocus
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-foreground">Tracking number</span>
          <Input
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value)}
            placeholder="Tracking / consignment number"
          />
        </label>
      </div>
    </Modal>
  );
};
