"use client";

import { Button, Modal } from "@outfiqe/design-system";

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
  <Modal
    open={isOpen}
    onClose={closeDeleteModal}
    title="Delete drop?"
    description="This can't be undone."
    footer={
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={closeDeleteModal}>
          Cancel
        </Button>
        <Button
          onClick={confirmDeletePost}
          isLoading={isDeleting}
          className="border border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-white"
        >
          Delete
        </Button>
      </div>
    }
  >
    <p className="text-sm text-muted-foreground">
      Cheriqs, chimes, and tags on this drop will be removed too.
    </p>
  </Modal>
);
