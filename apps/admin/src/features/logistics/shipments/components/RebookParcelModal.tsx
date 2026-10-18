import { Button, FormBanner, Label, Modal, Select, Textarea } from "@outfiqe/design-system";
import { useId, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { useDeliveryPartners } from "../../partners/hooks/useDeliveryPartners";
import { useRebookParcel } from "../hooks/useRebookParcel";

const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 500;
const NO_PARTNER_CHOSEN = "";

type RebookParcelModalProps = {
  shipmentId: string;
  currentPartnerId: string | null;
  onClose: () => void;
};

export const RebookParcelModal = ({
  shipmentId,
  currentPartnerId,
  onClose,
}: RebookParcelModalProps) => {
  const rebookParcel = useRebookParcel(shipmentId);
  const { data: partners } = useDeliveryPartners();
  const [partnerId, setPartnerId] = useState(currentPartnerId ?? NO_PARTNER_CHOSEN);
  const [reason, setReason] = useState("");
  const fieldIdPrefix = useId();
  const activePartners = partners?.filter(({ isActive }) => isActive) ?? [];
  const canRebook = partnerId !== NO_PARTNER_CHOSEN && reason.trim().length >= MIN_REASON_LENGTH;

  const submitRebooking = () => {
    rebookParcel.mutate({ partnerId, reason: reason.trim() }, { onSuccess: onClose });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={currentPartnerId ? "Change delivery partner" : "Choose a delivery partner"}
      description="Any booking with the old partner is cancelled here. Cancel it in their portal too. The parcel code and label stay the same."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button
            onClick={submitRebooking}
            disabled={!canRebook}
            isLoading={rebookParcel.isPending}
          >
            Save partner
          </Button>
        </div>
      }
    >
      {rebookParcel.isError && <FormBanner>{getErrorMessage(rebookParcel.error)}</FormBanner>}
      <div className="space-y-3">
        <div>
          <Label htmlFor={`${fieldIdPrefix}-partner`}>Partner</Label>
          <Select
            id={`${fieldIdPrefix}-partner`}
            value={partnerId}
            onChange={(event) => setPartnerId(event.target.value)}
          >
            <option value={NO_PARTNER_CHOSEN}>Choose a partner</option>
            {activePartners.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`${fieldIdPrefix}-reason`}>Why</Label>
          <Textarea
            id={`${fieldIdPrefix}-reason`}
            value={reason}
            maxLength={MAX_REASON_LENGTH}
            placeholder="e.g. Their rider didn't come to collect."
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
};
