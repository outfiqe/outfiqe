import { Button, Label, Modal, Select, Textarea } from "@outfiqe/design-system";
import { useId, useState } from "react";

const DURATION_OPTIONS = [
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 24 * 7 },
  { label: "30 days", hours: 24 * 30 },
  { label: "Indefinite", hours: undefined },
] as const;

type DurationValue = (typeof DURATION_OPTIONS)[number]["label"];

type SuspendAccountModalProps = {
  open: boolean;
  targetName: string;
  isPending?: boolean;
  onConfirm: (input: { reason: string; durationHours?: number }) => void;
  onCancel: () => void;
};

export const SuspendAccountModal = ({
  open,
  targetName,
  isPending = false,
  onConfirm,
  onCancel,
}: SuspendAccountModalProps) => {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<DurationValue>(DURATION_OPTIONS[3].label);
  const [wasOpen, setWasOpen] = useState(open);
  const reasonId = useId();
  const durationId = useId();

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setReason("");
      setDuration(DURATION_OPTIONS[3].label);
    }
  }

  const trimmedReason = reason.trim();
  const canConfirm = !isPending && trimmedReason.length > 0;

  const submit = () => {
    if (!canConfirm) return;
    const durationHours = DURATION_OPTIONS.find((option) => option.label === duration)?.hours;
    onConfirm({ reason: trimmedReason, durationHours });
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={`Suspend ${targetName}`}
      description="They'll be logged out everywhere and blocked from acting until this is lifted."
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canConfirm}>
            {isPending ? "Suspending…" : "Confirm suspension"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor={reasonId}>Reason (shown to the user)</Label>
          <Textarea
            id={reasonId}
            className="mt-1.5"
            value={reason}
            placeholder="Explain why this account is being suspended…"
            onChange={(event) => setReason(event.target.value)}
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor={durationId}>Duration</Label>
          <Select
            id={durationId}
            className="mt-1.5"
            value={duration}
            onChange={(event) => setDuration(event.target.value as DurationValue)}
          >
            {DURATION_OPTIONS.map((option) => (
              <option key={option.label} value={option.label}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </Modal>
  );
};
