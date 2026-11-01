"use client";

import { Button, ConfirmModal, Modal, toast } from "@outfiqe/design-system";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { CreatorLink } from "../api/creatorLinksSchemas";
import { useDeleteCreatorLink } from "../hooks/useDeleteCreatorLink";

type DeleteLinkModalProps = {
  link: CreatorLink;
  onClose: () => void;
  onDeleted: (link: CreatorLink) => void;
};

export const DeleteLinkModal = ({ link, onClose, onDeleted }: DeleteLinkModalProps) => {
  const deleteLink = useDeleteCreatorLink();

  const confirmDelete = async () => {
    try {
      await deleteLink.mutateAsync(link.id);
      toast.success("Link deleted");
      onDeleted(link);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <ConfirmModal
      open
      title="Delete link"
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      destructive
      isPending={deleteLink.isPending}
      onConfirm={() => void confirmDelete()}
      onCancel={onClose}
    >
      <p className="text-sm text-muted-foreground">
        Delete this link? It stops working right away, and anyone who opens it will see that it is
        no longer available. Clicks and commission you have already earned from it are kept.
      </p>
    </ConfirmModal>
  );
};
