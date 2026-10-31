"use client";

import { ConfirmModal } from "@outfiqe/design-system";

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
  <ConfirmModal
    open
    title="Delete chime?"
    description="This can't be undone."
    confirmLabel="Delete"
    pendingLabel="Deleting…"
    destructive
    isPending={isPending}
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);
