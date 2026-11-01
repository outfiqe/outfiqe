"use client";

import { ConfirmModal } from "@outfiqe/design-system";

type DeleteDropModalProps = {
  isOpen: boolean;
  isDeleting: boolean;
  closeDeleteModal: () => void;
  confirmDeletePost: () => void;
};

export const DeleteDropModal = ({
  isOpen,
  isDeleting,
  closeDeleteModal,
  confirmDeletePost,
}: DeleteDropModalProps) => (
  <ConfirmModal
    open={isOpen}
    title="Delete drop?"
    description="This can't be undone."
    confirmLabel="Delete"
    pendingLabel="Deleting…"
    destructive
    isPending={isDeleting}
    onConfirm={confirmDeletePost}
    onCancel={closeDeleteModal}
  >
    <p className="text-sm text-muted-foreground">
      Cheriqs, chimes, and tags on this drop will be removed too.
    </p>
  </ConfirmModal>
);
