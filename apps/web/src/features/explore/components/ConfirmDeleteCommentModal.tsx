"use client";

import { Button, Modal } from "@outfiqe/design-system";

type ConfirmDeleteCommentModalProps = {
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmDeleteCommentModal = ({
  isPending,
  onConfirm,
  onCancel,
}: ConfirmDeleteCommentModalProps) => (
  <Modal
    open
    onClose={onCancel}
    title="Delete comment?"
    footer={
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={isPending}>
          {isPending ? "Deleting…" : "Delete"}
        </Button>
      </div>
    }
  >
    <p className="text-sm text-muted-foreground">This can&apos;t be undone.</p>
  </Modal>
);
