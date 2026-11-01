import type { ReactNode } from "react";

import { Button } from "./button";
import { Modal } from "./modal";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

export const ConfirmModal = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  pendingLabel = "Working…",
  cancelLabel = "Cancel",
  destructive = false,
  isPending = false,
  onConfirm,
  onCancel,
  children = null,
}: ConfirmModalProps) => {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className={
              destructive ? "bg-destructive text-white hover:bg-destructive/90" : undefined
            }
          >
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {children}
      </div>
    </Modal>
  );
};
