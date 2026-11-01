import {
  Button,
  DateInput,
  FormBanner,
  Input,
  Label,
  Modal,
  Textarea,
} from "@outfiqe/design-system";
import { useId, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import type { RecordCodRemittanceBody } from "../api/codSchemas";
import { useRecordCodRemittance } from "../hooks/useRecordCodRemittance";
import {
  dateInputValueToIso,
  formatCashAmount,
  type RemittanceTotals,
  toDateInputValue,
} from "../utils/codRemittance.utils";

const MAX_REFERENCE_LENGTH = 120;
const MAX_NOTE_LENGTH = 500;
const MIN_RECEIVED_AMOUNT = 0;

type RecordRemittanceModalProps = {
  partnerId: string;
  partnerName: string;
  lines: RecordCodRemittanceBody["lines"];
  totals: RemittanceTotals;
  onRecorded: () => void;
  onClose: () => void;
};

export const RecordRemittanceModal = ({
  partnerId,
  partnerName,
  lines,
  totals,
  onRecorded,
  onClose,
}: RecordRemittanceModalProps) => {
  const recordRemittance = useRecordCodRemittance();
  const [reference, setReference] = useState("");
  const [receivedOn, setReceivedOn] = useState(() => toDateInputValue(new Date()));
  const [receivedAmount, setReceivedAmount] = useState(totals.receivedAmount);
  const [note, setNote] = useState("");
  const fieldIdPrefix = useId();
  const trimmedReference = reference.trim();
  const todayInputValue = toDateInputValue(new Date());
  const isDifferentFromTicked = receivedAmount !== totals.receivedAmount;

  const submitRemittance = () => {
    const trimmedNote = note.trim();
    recordRemittance.mutate(
      {
        partnerId,
        reference: trimmedReference,
        receivedAt: dateInputValueToIso(receivedOn),
        receivedAmount,
        lines,
        ...(trimmedNote ? { note: trimmedNote } : {}),
      },
      { onSuccess: onRecorded },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Record a payment from ${partnerName}`}
      description={`${totals.parcelCount} parcels · ${formatCashAmount(totals.collectedAmount)} collected · ${formatCashAmount(totals.partnerFeeAmount)} in fees`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button
            onClick={submitRemittance}
            disabled={!trimmedReference || !receivedOn}
            isLoading={recordRemittance.isPending}
          >
            Record payment
          </Button>
        </div>
      }
    >
      {recordRemittance.isError && (
        <FormBanner>{getErrorMessage(recordRemittance.error)}</FormBanner>
      )}
      <div className="space-y-3">
        <div>
          <Label htmlFor={`${fieldIdPrefix}-reference`}>Bank or transfer reference</Label>
          <Input
            id={`${fieldIdPrefix}-reference`}
            value={reference}
            maxLength={MAX_REFERENCE_LENGTH}
            onChange={(event) => setReference(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`${fieldIdPrefix}-date`}>Date the money arrived</Label>
          <DateInput
            id={`${fieldIdPrefix}-date`}
            value={receivedOn}
            max={todayInputValue}
            onChange={(event) => setReceivedOn(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`${fieldIdPrefix}-amount`}>Amount received</Label>
          <Input
            id={`${fieldIdPrefix}-amount`}
            type="number"
            inputMode="numeric"
            min={MIN_RECEIVED_AMOUNT}
            value={receivedAmount}
            onChange={(event) => setReceivedAmount(Number(event.target.value))}
          />
          {isDifferentFromTicked && (
            <p className="mt-1 text-sm text-destructive">
              The ticked parcels come to {formatCashAmount(totals.receivedAmount)} after fees. Check
              the parcels and fees before saving.
            </p>
          )}
        </div>
        <div>
          <Label htmlFor={`${fieldIdPrefix}-note`}>Note (optional)</Label>
          <Textarea
            id={`${fieldIdPrefix}-note`}
            value={note}
            maxLength={MAX_NOTE_LENGTH}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
};
