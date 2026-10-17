import { Button, Input, Label } from "@outfiqe/design-system";
import { type FormEvent, useId, useState } from "react";

import { useRecordManualBooking } from "../hooks/useRecordManualBooking";

type ManualBookingFormProps = { shipmentId: string; partnerName: string };

export const ManualBookingForm = ({ shipmentId, partnerName }: ManualBookingFormProps) => {
  const recordManualBooking = useRecordManualBooking(shipmentId);
  const [partnerReference, setPartnerReference] = useState("");
  const referenceInputId = useId();
  const trimmedReference = partnerReference.trim();

  const submitBooking = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedReference) return;
    recordManualBooking.mutate(trimmedReference, { onSuccess: () => setPartnerReference("") });
  };

  return (
    <form onSubmit={submitBooking} className="flex flex-wrap items-end gap-2">
      <div className="min-w-48 flex-1">
        <Label htmlFor={referenceInputId}>{partnerName}&apos;s parcel number</Label>
        <Input
          id={referenceInputId}
          value={partnerReference}
          autoComplete="off"
          onChange={(event) => setPartnerReference(event.target.value)}
        />
      </div>
      <Button
        type="submit"
        size="sm"
        disabled={!trimmedReference}
        isLoading={recordManualBooking.isPending}
      >
        Save booking
      </Button>
    </form>
  );
};
