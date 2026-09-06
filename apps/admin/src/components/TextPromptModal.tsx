import { Button, Input, Modal } from "@outfiqe/design-system";
import { useId, useState } from "react";

type TextPromptModalProps = {
  open: boolean;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  inputType?: "text" | "number";
  required?: boolean;
  confirmLabel?: string;
  pendingLabel?: string;
  isPending?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

export const TextPromptModal = ({
  open,
  title,
  description,
  label,
  placeholder,
  defaultValue = "",
  inputType = "text",
  required = true,
  confirmLabel = "Confirm",
  pendingLabel = "Working…",
  isPending = false,
  onConfirm,
  onCancel,
}: TextPromptModalProps) => {
  const [value, setValue] = useState(defaultValue);
  const [wasOpen, setWasOpen] = useState(open);
  const inputId = useId();

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setValue(defaultValue);
  }

  const trimmed = value.trim();
  const canConfirm = !isPending && (!required || trimmed.length > 0);

  const submit = () => {
    if (!canConfirm) return;
    onConfirm(trimmed);
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canConfirm}>
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      }
    >
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor={inputId}>
          {label}
        </label>
        <Input
          id={inputId}
          type={inputType}
          value={value}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          autoFocus
        />
      </div>
    </Modal>
  );
};
