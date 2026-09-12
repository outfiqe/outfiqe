import { Button, Label, Modal, Textarea } from "@outfiqe/design-system";
import { useId, useState } from "react";

type BanAccountModalProps = {
  open: boolean;
  targetName: string;
  isPending?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
};

export const BanAccountModal = ({
  open,
  targetName,
  isPending = false,
  onConfirm,
  onCancel,
}: BanAccountModalProps) => {
  const [reason, setReason] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  const reasonId = useId();

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setReason("");
  }

  const trimmedReason = reason.trim();
  const canConfirm = !isPending && trimmedReason.length > 0;

  const submit = () => {
    if (!canConfirm) return;
    onConfirm(trimmedReason);
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={`Ban ${targetName}`}
      description="This has no automatic end date, and lifting it later will require a different admin than you."
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canConfirm}>
            {isPending ? "Banning…" : "Confirm ban"}
          </Button>
        </div>
      }
    >
      <div>
        <Label htmlFor={reasonId}>Reason (shown to the user)</Label>
        <Textarea
          id={reasonId}
          className="mt-1.5"
          value={reason}
          placeholder="Explain why this account is being banned…"
          onChange={(event) => setReason(event.target.value)}
          autoFocus
        />
      </div>
    </Modal>
  );
};
