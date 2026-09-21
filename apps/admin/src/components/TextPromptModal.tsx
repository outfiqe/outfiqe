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
  requiredMessage?: string;
  validate?: (trimmedValue: string) => string | null;
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
  requiredMessage = "Enter a value to continue.",
  validate,
  confirmLabel = "Confirm",
  pendingLabel = "Working…",
  isPending = false,
  onConfirm,
  onCancel,
}: TextPromptModalProps) => {
  const [value, setValue] = useState(defaultValue);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  const inputId = useId();
  const errorId = useId();

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValue(defaultValue);
      setErrorMessage(null);
    }
  }

  const findProblem = (trimmedValue: string): string | null => {
    if (required && trimmedValue.length === 0) return requiredMessage;
    return validate?.(trimmedValue) ?? null;
  };

  const submit = () => {
    if (isPending) return;
    const trimmed = value.trim();
    const problem = findProblem(trimmed);
    setErrorMessage(problem);
    if (problem) return;
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
          <Button onClick={submit} isLoading={isPending}>
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
          aria-invalid={errorMessage !== null}
          aria-describedby={errorMessage ? errorId : undefined}
          onChange={(event) => {
            setValue(event.target.value);
            if (errorMessage) setErrorMessage(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          autoFocus
        />
        {errorMessage && (
          <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-destructive">
            {errorMessage}
          </p>
        )}
      </div>
    </Modal>
  );
};
