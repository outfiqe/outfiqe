import {
  Button,
  Checkbox,
  FormBanner,
  Input,
  Label,
  Modal,
  Select,
  Textarea,
} from "@outfiqe/design-system";
import { useId, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import {
  PARCEL_EVENT_CODES,
  type ParcelEventCode,
  parcelEventCodeSchema,
} from "../api/parcelsSchemas";
import {
  PARCEL_EVENT_CODE_LABELS,
  PARCEL_UPDATE_NOTE_MAX_LENGTH,
  PARCEL_UPDATE_NOTE_MIN_LENGTH,
} from "../constants/parcelLabels";
import { useRecordParcelUpdate } from "../hooks/useRecordParcelUpdate";

const [DEFAULT_EVENT_CODE] = PARCEL_EVENT_CODES;
const MAX_RAW_STATUS_LENGTH = 120;
const DELIVERED_EVENT_CODE: ParcelEventCode = "DELIVERED";
const NO_CASH = 0;

type RecordParcelUpdateModalProps = {
  shipmentId: string;
  codAmountToCollect: number;
  onClose: () => void;
};

export const RecordParcelUpdateModal = ({
  shipmentId,
  codAmountToCollect,
  onClose,
}: RecordParcelUpdateModalProps) => {
  const recordUpdate = useRecordParcelUpdate(shipmentId);
  const [code, setCode] = useState<ParcelEventCode>(DEFAULT_EVENT_CODE);
  const [rawStatus, setRawStatus] = useState("");
  const [note, setNote] = useState("");
  const [isCorrection, setIsCorrection] = useState(false);
  const [codCollectedAmount, setCodCollectedAmount] = useState(codAmountToCollect);
  const fieldIdPrefix = useId();
  const trimmedNote = note.trim();
  const isDelivery = code === DELIVERED_EVENT_CODE;

  const submitUpdate = () => {
    const trimmedRawStatus = rawStatus.trim();
    recordUpdate.mutate(
      {
        code,
        note: trimmedNote,
        isCorrection,
        ...(trimmedRawStatus ? { rawStatus: trimmedRawStatus } : {}),
        ...(isDelivery ? { codCollectedAmount } : {}),
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Record a parcel update"
      description="Use this when the partner tells you about a parcel by phone or message."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button
            onClick={submitUpdate}
            disabled={trimmedNote.length < PARCEL_UPDATE_NOTE_MIN_LENGTH}
            isLoading={recordUpdate.isPending}
          >
            Save update
          </Button>
        </div>
      }
    >
      {recordUpdate.isError && <FormBanner>{getErrorMessage(recordUpdate.error)}</FormBanner>}
      <div className="space-y-3">
        <div>
          <Label htmlFor={`${fieldIdPrefix}-code`}>What happened</Label>
          <Select
            id={`${fieldIdPrefix}-code`}
            value={code}
            onChange={(event) => {
              const parsedCode = parcelEventCodeSchema.safeParse(event.target.value);
              if (parsedCode.success) setCode(parsedCode.data);
            }}
          >
            {PARCEL_EVENT_CODES.map((eventCode) => (
              <option key={eventCode} value={eventCode}>
                {PARCEL_EVENT_CODE_LABELS[eventCode]}
              </option>
            ))}
          </Select>
        </div>
        {isDelivery && (
          <div>
            <Label htmlFor={`${fieldIdPrefix}-cash`}>Cash the partner collected</Label>
            <Input
              id={`${fieldIdPrefix}-cash`}
              type="number"
              inputMode="numeric"
              min={NO_CASH}
              value={codCollectedAmount}
              onChange={(event) => setCodCollectedAmount(Number(event.target.value))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The label asked for Rs. {codAmountToCollect.toLocaleString()}. A different amount is
              flagged on the parcel and in Partner cash.
            </p>
          </div>
        )}
        <div>
          <Label htmlFor={`${fieldIdPrefix}-raw`}>The partner&apos;s words (optional)</Label>
          <Input
            id={`${fieldIdPrefix}-raw`}
            value={rawStatus}
            maxLength={MAX_RAW_STATUS_LENGTH}
            onChange={(event) => setRawStatus(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`${fieldIdPrefix}-note`}>Note</Label>
          <Textarea
            id={`${fieldIdPrefix}-note`}
            value={note}
            maxLength={PARCEL_UPDATE_NOTE_MAX_LENGTH}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
          <Checkbox
            checked={isCorrection}
            onChange={(event) => setIsCorrection(event.target.checked)}
          />
          <span>
            This corrects a mistake. The parcel moves to this status even if it&apos;s already
            finished. Corrections are logged.
          </span>
        </label>
      </div>
    </Modal>
  );
};
