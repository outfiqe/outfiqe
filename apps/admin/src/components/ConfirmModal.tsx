import { Button, Modal } from "@outfiqe/design-system";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  destructive?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmModal = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  pendingLabel = "Working…",
  destructive = false,
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
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
      {null}
    </Modal>
  );
};
